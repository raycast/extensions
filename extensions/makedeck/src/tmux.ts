import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Dedicated tmux server for dev services; must match SOCKET in bin/makedeck.
// MAKEDECK_SOCKET is for tests only.
export const SOCKET = process.env.MAKEDECK_SOCKET || "makedeck";

// Raycast runs extensions without Homebrew on PATH (affects tmux and e.g. docker in dev-stop).
const EXTRA_PATH = ["/opt/homebrew/bin", "/usr/local/bin"];
const TMUX_CANDIDATES = EXTRA_PATH.map((dir) => `${dir}/tmux`);

// Optional Makefile target that "Stop Project" runs after the processes are gone,
// e.g. for Docker containers started with "up -d".
export const STOP_TARGET = "dev-stop";
const STOP_TIMEOUT_MS = 5000;

export type Service = {
  project: string;
  projectPath: string;
  index: number;
  windowId: string;
  name: string;
  status: "running" | "exited";
  exitCode: number | null;
};

const LIST_FORMAT = [
  "#{session_name}",
  "#{session_path}",
  "#{window_index}",
  "#{window_id}",
  "#{window_name}",
  "#{pane_dead}",
  "#{pane_dead_status}",
].join("\t");

export function parseWindows(output: string): Service[] {
  return output
    .split("\n")
    .filter((line) => line !== "")
    .map((line): Service => {
      const fields = line.split("\t");
      if (fields.length !== 7) throw new Error(`unexpected tmux output: ${line}`);
      const [project, projectPath, index, windowId, name, dead, deadStatus] = fields;
      const exited = dead === "1";
      return {
        project,
        projectPath,
        index: Number(index),
        windowId,
        name,
        status: exited ? "exited" : "running",
        // tmux reports no status when the process was killed by a signal (e.g. Ctrl-C).
        exitCode: exited && deadStatus !== "" ? Number(deadStatus) : null,
      };
    });
}

export function tailLog(raw: string, maxLines: number): string {
  const lines = raw.split("\n");
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return lines.slice(-maxLines).join("\n");
}

// Raycast cannot scroll the detail view (markdown always starts at the top) and soft-wraps
// long lines. To keep the newest output visible, take the last `rows` lines and cut each
// to `cols` characters so every log line takes exactly one row.
export function fitLog(log: string, rows: number, cols: number): string {
  return log
    .split("\n")
    .slice(-rows)
    .map((line) => (line.length <= cols ? line : line.slice(0, cols - 1) + "…"))
    .join("\n");
}

// Raycast does not truncate section subtitles; long paths overflow onto the next row.
export function truncateStart(text: string, max: number): string {
  if (text.length <= max) return text;
  return max <= 0 ? "" : "…" + text.slice(text.length - max + 1);
}

export function logMarkdown(log: string): string {
  return "```\n" + log.replaceAll("```", "`​``") + "\n```";
}

export function hasTarget(makefile: string, target: string): boolean {
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // ":=" is a variable assignment, not a target.
  return new RegExp(`^${escaped}[ \\t]*:(?!=)`, "m").test(makefile);
}

export class TmuxMissingError extends Error {}

function tmuxBinary(): string {
  const bin = TMUX_CANDIDATES.find((path) => existsSync(path));
  if (!bin) throw new TmuxMissingError("tmux not found. Install it with: brew install tmux");
  return bin;
}

async function tmux(...args: string[]): Promise<string> {
  // -u: Raycast starts without LANG; without UTF-8, tmux replaces the tab separators with "_".
  const { stdout } = await execFileAsync(tmuxBinary(), ["-u", "-L", SOCKET, ...args]);
  return stdout;
}

function isNoServer(error: unknown): boolean {
  const stderr = (error as { stderr?: string }).stderr ?? "";
  return /no server running|error connecting to/.test(stderr);
}

export async function listServices(): Promise<Service[]> {
  try {
    return parseWindows(await tmux("list-windows", "-a", "-F", LIST_FORMAT));
  } catch (error) {
    if (isNoServer(error)) return [];
    throw error;
  }
}

export async function captureLog(windowId: string, maxLines = 200): Promise<string> {
  // -J joins wrapped lines, -S -N includes N lines of history.
  const out = await tmux("capture-pane", "-p", "-J", "-S", `-${maxLines}`, "-t", windowId);
  return tailLog(out, maxLines);
}

// tmux reports an empty PID for exited panes.
export function parsePanes(output: string): { pid: number | null; dead: boolean }[] {
  return output
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      const [pid, dead] = line.split("\t");
      return { pid: /^\d+$/.test(pid) ? Number(pid) : null, dead: dead === "1" };
    });
}

async function panes(target: string[]): Promise<{ pid: number | null; dead: boolean }[]> {
  return parsePanes(await tmux("list-panes", ...target, "-F", "#{pane_pid}\t#{pane_dead}"));
}

function signalGroup(pid: number, signal: NodeJS.Signals): void {
  // kill(-0) would hit our own process group (Raycast), kill(-1) every process of the user.
  if (!Number.isInteger(pid) || pid <= 1) throw new Error(`invalid pane PID: ${pid}`);
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
  }
}

// Closing or respawning a window in tmux does not reliably end its processes; they keep
// running under PID 1. Each pane process leads its own process group, so SIGTERM to the
// group also reaches children, "&" and nohup processes. Exited panes have no PID and are
// skipped. Anything still running after STOP_TIMEOUT_MS gets SIGKILL.
async function terminate(target: string[]): Promise<void> {
  const groups = (await panes(target)).flatMap(({ pid }) => (pid === null ? [] : [{ pid }]));
  for (const { pid } of groups) signalGroup(pid, "SIGTERM");
  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while ((await panes(target)).some((pane) => !pane.dead)) {
    if (Date.now() > deadline) {
      for (const { pid } of groups) signalGroup(pid, "SIGKILL");
      return;
    }
    await sleep(100);
  }
}

export async function restartService(windowId: string): Promise<void> {
  await terminate(["-t", windowId]);
  await tmux("respawn-window", "-k", "-t", windowId);
}

export async function stopService(windowId: string): Promise<void> {
  await terminate(["-t", windowId]);
}

// Returns whether STOP_TARGET was run.
export async function stopProject(project: string, projectPath: string): Promise<boolean> {
  await terminate(["-s", "-t", `=${project}`]);
  await tmux("kill-session", "-t", `=${project}`);

  const makefile = join(projectPath, "Makefile");
  if (!existsSync(makefile) || !hasTarget(readFileSync(makefile, "utf8"), STOP_TARGET)) return false;
  await execFileAsync("make", [STOP_TARGET], {
    cwd: projectPath,
    env: { ...process.env, PATH: [...EXTRA_PATH, process.env.PATH].join(":") },
    timeout: 120_000,
  });
  return true;
}

const shellQuote = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

export async function openInTerminal(service: Service): Promise<void> {
  const bin = tmuxBinary();
  const attach =
    `${bin} -L ${SOCKET} select-window -t ${shellQuote(service.windowId)} && ` +
    `${bin} -L ${SOCKET} attach -t ${shellQuote(`=${service.project}`)}`;
  await execFileAsync("osascript", ["-e", OPEN_IN_TERMINAL, attach]);
}

// Terminal opens a window by itself when it launches, so reuse that one instead of
// adding a second, empty one. Activate only afterwards: activating a running Terminal
// that has no windows would also open an empty one.
const OPEN_IN_TERMINAL = `
on run argv
  set cmd to item 1 of argv
  set wasRunning to application "Terminal" is running
  tell application "Terminal"
    if not wasRunning then
      repeat 40 times
        if (count of windows) > 0 then exit repeat
        delay 0.05
      end repeat
    end if
    if not wasRunning and (count of windows) > 0 then
      do script cmd in window 1
    else
      do script cmd
    end if
    activate
  end tell
end run`;
