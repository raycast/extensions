import { execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir, userInfo } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Dedicated tmux server for dev services; must match SOCKET in bin/makedeck.
// MAKEDECK_SOCKET is for tests only.
export const SOCKET = process.env.MAKEDECK_SOCKET || "makedeck";

// Raycast runs extensions without Homebrew, MacPorts, Nix or ~/.local/bin on PATH (affects
// tmux, makedeck for "Move to makedeck", and e.g. docker in dev-stop).
const EXTRA_PATH = [
  `${homedir()}/.local/bin`,
  "/opt/homebrew/bin",
  "/usr/local/bin",
  "/opt/local/bin",
  `${homedir()}/.nix-profile/bin`,
  `/etc/profiles/per-user/${userInfo().username}/bin`,
  "/run/current-system/sw/bin",
  "/nix/var/nix/profiles/default/bin",
];
export const SEARCH_PATH: string[] = [...EXTRA_PATH, ...(process.env.PATH ?? "").split(":").filter(Boolean)];

export function findBinary(name: string): string | undefined {
  return SEARCH_PATH.map((dir) => `${dir}/${name}`).find((path) => existsSync(path));
}

// Optional Makefile target that "Stop Project" runs after the processes are gone,
// e.g. for Docker containers started with "up -d".
export const STOP_TARGET = "dev-stop";
const STOP_TIMEOUT_MS = 5000;
const KILL_TIMEOUT_MS = 2000;

export type Service = {
  project: string;
  projectPath: string;
  index: number;
  windowId: string;
  name: string;
  status: "running" | "exited";
  exitCode: number | null;
  // Pane process, which leads the window's process group; null for exited panes.
  pid: number | null;
};

const LIST_FORMAT = [
  "#{session_name}",
  "#{session_path}",
  "#{window_index}",
  "#{window_id}",
  "#{window_name}",
  "#{pane_dead}",
  "#{pane_dead_status}",
  "#{pane_pid}",
].join("\t");

export function parseWindows(output: string): Service[] {
  return output
    .split("\n")
    .filter((line) => line !== "")
    .map((line): Service => {
      const fields = line.split("\t");
      if (fields.length !== 8) throw new Error(`unexpected tmux output: ${line}`);
      const [project, projectPath, index, windowId, name, dead, deadStatus, pid] = fields;
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
        // tmux reports an empty PID for exited panes.
        pid: /^\d+$/.test(pid) ? Number(pid) : null,
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

// Make reports this when the target is defined nowhere, neither in the Makefile nor in an
// included file. A missing prerequisite names the prerequisite instead, and a sub-make in a
// recipe reports as "make[1]:", so only the top-level "make:" line counts. make 3.81 (macOS)
// quotes with `target', newer versions with 'target'.
export function isMissingTarget(stderr: string, target: string): boolean {
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^make: \\*\\*\\* No rule to make target [\`']${escaped}'`, "m").test(stderr);
}

export class TmuxMissingError extends Error {}

function tmuxBinary(): string {
  const bin = findBinary("tmux");
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

// Our own process group (Raycast, or the test runner), looked up once.
let ownGroup: number | undefined;
function ownProcessGroup(): number {
  ownGroup ??= Number(
    execFileSync("/bin/ps", ["-o", "pgid=", "-p", String(process.pid)])
      .toString()
      .trim(),
  );
  return ownGroup;
}

// What to signal: whole process groups, and single processes outside of them.
export type StopTargets = { groups: number[]; pids: number[] };

// Returns false if the group or process no longer exists. Signal 0 only checks that it exists.
function signalTarget(kind: "group" | "process", id: number, signal: NodeJS.Signals | 0): boolean {
  // kill(-0) would hit our own process group (Raycast), kill(-1) every process of the user.
  if (!Number.isInteger(id) || id <= 1) throw new Error(`invalid ${kind === "group" ? "process group" : "PID"}: ${id}`);
  if (kind === "group" && id === ownProcessGroup()) throw new Error("refusing to signal own process group");
  if (kind === "process" && id === process.pid) throw new Error("refusing to signal own process");
  try {
    process.kill(kind === "group" ? -id : id, signal);
    return true;
  } catch (error) {
    // macOS reports EPERM instead of ESRCH when every process left in the group has exited
    // but is not yet reaped (zombies, e.g. right after SIGKILL). For a single PID, EPERM
    // means it now belongs to another user. The signal reaches no process of ours either way.
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== "ESRCH" && code !== "EPERM") throw error;
    return false;
  }
}

function signalAll({ groups, pids }: StopTargets, signal: NodeJS.Signals | 0): boolean {
  const results = [
    ...groups.map((pgid) => signalTarget("group", pgid, signal)),
    ...pids.map((pid) => signalTarget("process", pid, signal)),
  ];
  return results.some(Boolean);
}

// A group leader can exit while a child that ignores SIGTERM keeps running in its
// group, so wait for the groups themselves, not only for the leader.
async function waitForExit(targets: StopTargets, stillRunning: () => Promise<boolean>, timeoutMs: number) {
  const deadline = Date.now() + timeoutMs;
  while (signalAll(targets, 0) || (await stillRunning())) {
    if (Date.now() > deadline) return false;
    await sleep(100);
  }
  return true;
}

// SIGTERM to every group, so it also reaches children, "&" and nohup processes, and to
// every single process. Anything still running after STOP_TIMEOUT_MS gets SIGKILL.
// Groups and processes that no longer exist are fine.
export async function terminateProcesses(
  targets: StopTargets,
  stillRunning: () => Promise<boolean> = async () => false,
): Promise<void> {
  signalAll(targets, "SIGTERM");
  if (await waitForExit(targets, stillRunning, STOP_TIMEOUT_MS)) return;
  signalAll(targets, "SIGKILL");
  if (!(await waitForExit(targets, stillRunning, KILL_TIMEOUT_MS))) {
    throw new Error("Processes are still running after SIGKILL");
  }
}

// Closing or respawning a window in tmux does not reliably end its processes; they keep
// running under PID 1. Each pane process leads its own process group. Exited panes have
// no PID and are skipped; the panes themselves must be dead, too.
// Mirrors terminate() in bin/makedeck; keep both in sync.
async function terminate(target: string[]): Promise<void> {
  const pids = (await panes(target)).flatMap(({ pid }) => (pid === null ? [] : [pid]));
  await terminateProcesses({ groups: pids, pids: [] }, async () => (await panes(target)).some((pane) => !pane.dead));
}

export async function restartService(windowId: string): Promise<void> {
  await terminate(["-t", windowId]);
  await tmux("respawn-window", "-k", "-t", windowId);
}

export async function stopService(windowId: string): Promise<void> {
  await terminate(["-t", windowId]);
}

// Returns whether STOP_TARGET was run. Make decides whether it exists, so it may also be
// defined in an included file.
export async function stopProject(project: string, projectPath: string): Promise<boolean> {
  await terminate(["-s", "-t", `=${project}`]);
  await tmux("kill-session", "-t", `=${project}`);

  // For isMissingTarget: LC_ALL=C keeps the message unlocalized, and without an inherited
  // MAKELEVEL the top-level make reports as "make:".
  const env: NodeJS.ProcessEnv = { ...process.env, PATH: SEARCH_PATH.join(":"), LC_ALL: "C" };
  delete env.MAKELEVEL;
  try {
    await execFileAsync("make", [STOP_TARGET], {
      cwd: projectPath,
      env,
      timeout: 120_000,
    });
    return true;
  } catch (error) {
    if (isMissingTarget((error as { stderr?: string }).stderr ?? "", STOP_TARGET)) return false;
    throw error;
  }
}

export const shellQuote = (value: string) => `'${value.replaceAll("'", `'\\''`)}'`;

export async function openInTerminal(service: Service): Promise<void> {
  const tmuxCmd = `${shellQuote(tmuxBinary())} -L ${shellQuote(SOCKET)}`;
  const attach =
    `${tmuxCmd} select-window -t ${shellQuote(service.windowId)} && ` +
    `${tmuxCmd} attach -t ${shellQuote(`=${service.project}`)}`;
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
