import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { delimiter, join } from "node:path";
import { homedir } from "node:os";
import { execFile } from "node:child_process";
import { getHerdrPreferences } from "./preferences";
import type { HerdrSession, HerdrSnapshot, PaneInfo } from "./types";

interface RunOptions {
  timeout?: number;
  session?: string;
}

interface CliEnvelope<T> {
  id?: string;
  result?: T;
  error?: { code?: string; message?: string };
}

let resolvedBinary: string | undefined;

export class HerdrError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "HerdrError";
  }
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export async function resolveHerdrBinary(): Promise<string> {
  const configured = getHerdrPreferences().herdrPath?.trim();
  if (configured) {
    if (await isExecutable(configured)) return configured;
    throw new HerdrError(
      "The configured Herdr binary is not executable",
      "binary_not_found",
      `Check the Herdr Binary preference: ${configured}`,
    );
  }
  if (resolvedBinary && (await isExecutable(resolvedBinary))) return resolvedBinary;

  const candidates = [
    ...(process.env.PATH || "")
      .split(delimiter)
      .filter(Boolean)
      .map((directory) => join(directory, "herdr")),
    join(homedir(), ".local", "bin", "herdr"),
    "/opt/homebrew/bin/herdr",
    "/usr/local/bin/herdr",
    "/usr/bin/herdr",
  ];
  for (const candidate of [...new Set(candidates)]) {
    if (await isExecutable(candidate)) {
      resolvedBinary = candidate;
      return candidate;
    }
  }
  throw new HerdrError(
    "Herdr is not installed or could not be found",
    "binary_not_found",
    "Install it with `brew install herdr`, or set the Herdr Binary preference.",
  );
}

function extractCliError(stdout: string, stderr: string): HerdrError | undefined {
  for (const candidate of [stderr.trim(), stdout.trim()]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as CliEnvelope<unknown>;
      if (parsed.error) {
        return new HerdrError(parsed.error.message || "Herdr command failed", parsed.error.code, candidate);
      }
    } catch {
      // The CLI also returns human-readable errors. They are handled by the caller.
    }
  }
  return undefined;
}

export async function runHerdr(args: string[], options: RunOptions = {}): Promise<string> {
  const binary = await resolveHerdrBinary();
  const preferences = getHerdrPreferences();
  const selectedSession = options.session ?? preferences.sessionName?.trim();
  const env = { ...process.env };
  if (selectedSession && selectedSession !== "default") env.HERDR_SESSION = selectedSession;
  else delete env.HERDR_SESSION;

  return new Promise<string>((resolve, reject) => {
    execFile(
      binary,
      args,
      { env, timeout: options.timeout ?? 30_000, maxBuffer: 16 * 1024 * 1024, encoding: "utf8" },
      (error, stdout, stderr) => {
        const cliError = extractCliError(stdout, stderr);
        if (cliError) return reject(cliError);
        if (error) {
          const detail = stderr.trim() || stdout.trim() || error.message;
          const timedOut = "killed" in error && error.killed;
          return reject(
            new HerdrError(
              timedOut ? "The Herdr command timed out" : "Unable to run the Herdr command",
              timedOut ? "timeout" : "command_failed",
              detail,
            ),
          );
        }
        resolve(stdout);
      },
    );
  });
}

export async function runHerdrJson<T>(args: string[], options: RunOptions = {}): Promise<T> {
  const output = await runHerdr(args, options);
  try {
    const parsed = JSON.parse(output) as CliEnvelope<T> & T;
    if (parsed.error) throw new HerdrError(parsed.error.message || "Herdr command failed", parsed.error.code, output);
    return parsed.result === undefined ? (parsed as T) : parsed.result;
  } catch (error) {
    if (error instanceof HerdrError) throw error;
    throw new HerdrError("Herdr returned an unexpected response", "invalid_json", output.slice(0, 2_000));
  }
}

export async function getSnapshot(): Promise<HerdrSnapshot> {
  const result = await runHerdrJson<{ snapshot: HerdrSnapshot }>(["api", "snapshot"]);
  if (!result.snapshot) throw new HerdrError("Herdr did not return a session snapshot", "invalid_snapshot");
  return result.snapshot;
}

export async function getSessions(): Promise<HerdrSession[]> {
  const response = await runHerdrJson<{ sessions: HerdrSession[] }>(["session", "list", "--json"], { session: "" });
  return response.sessions ?? [];
}

export async function focusResource(kind: "workspace" | "tab" | "pane" | "agent", id: string): Promise<void> {
  if (kind === "pane") {
    await focusPane(id);
    return;
  }
  await runHerdr([kind, "focus", id]);
}

type PaneDirection = "left" | "right" | "up" | "down";

interface PaneNeighborResponse {
  neighbor: {
    pane_id: string;
    direction: PaneDirection;
    neighbor_pane_id?: string;
  };
}

export async function focusPane(paneId: string): Promise<void> {
  const target = await runHerdrJson<{ pane: PaneInfo }>(["pane", "get", paneId]);
  await runHerdr(["tab", "focus", target.pane.tab_id]);
  const layout = await runHerdrJson<{ layout: { focused_pane_id: string; panes: Array<{ pane_id: string }> } }>([
    "pane",
    "layout",
    "--pane",
    paneId,
  ]);
  const start = layout.layout.focused_pane_id;
  if (start === paneId) return;

  const directions: PaneDirection[] = ["left", "right", "up", "down"];
  const parent = new Map<string, { from: string; direction: PaneDirection }>();
  const visited = new Set<string>([start]);
  const queue = [start];

  while (queue.length > 0 && !visited.has(paneId)) {
    const source = queue.shift()!;
    const neighbors = await Promise.all(
      directions.map(async (direction) => {
        const result = await runHerdrJson<PaneNeighborResponse>([
          "pane",
          "neighbor",
          "--direction",
          direction,
          "--pane",
          source,
        ]);
        return { direction, paneId: result.neighbor.neighbor_pane_id };
      }),
    );
    for (const neighbor of neighbors) {
      if (!neighbor.paneId || visited.has(neighbor.paneId)) continue;
      visited.add(neighbor.paneId);
      parent.set(neighbor.paneId, { from: source, direction: neighbor.direction });
      queue.push(neighbor.paneId);
    }
  }

  if (!visited.has(paneId)) {
    throw new HerdrError("Herdr could not find a focus path to the selected pane", "pane_focus_path_not_found");
  }

  const path: Array<{ from: string; to: string; direction: PaneDirection }> = [];
  let current = paneId;
  while (current !== start) {
    const edge = parent.get(current);
    if (!edge) throw new HerdrError("Herdr returned an incomplete pane layout", "invalid_pane_layout");
    path.unshift({ from: edge.from, to: current, direction: edge.direction });
    current = edge.from;
  }
  for (const edge of path) {
    await runHerdr(["pane", "focus", "--direction", edge.direction, "--pane", edge.from]);
  }
}

export async function readPane(target: string, lines: number, agent = false): Promise<string> {
  return runHerdr([agent ? "agent" : "pane", "read", target, "--source", "recent-unwrapped", "--lines", String(lines)]);
}

export async function sendAgentPrompt(target: string, prompt: string): Promise<void> {
  await runHerdr(["agent", "prompt", target, prompt]);
}

export async function sendAgentKeys(target: string, keys: string[]): Promise<void> {
  await runHerdr(["agent", "send-keys", target, ...keys]);
}

export async function sendPaneKeys(target: string, keys: string[]): Promise<void> {
  await runHerdr(["pane", "send-keys", target, ...keys]);
}

export async function runInPane(target: string, command: string): Promise<void> {
  await runHerdr(["pane", "run", target, command]);
}

export function getAgentTarget(agent: { name?: string; pane_id: string }): string {
  return agent.name || agent.pane_id;
}

export function formatHerdrError(error: unknown): { title: string; message?: string } {
  if (error instanceof HerdrError) return { title: error.message, message: error.detail };
  if (error instanceof Error) return { title: error.message };
  return { title: "Unexpected Herdr error", message: String(error) };
}
