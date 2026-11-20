import { getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Action, Daemon, decode, formatElapsed } from "./model";

const home = homedir();
const CANDIDATES = [
  join(home, ".local/share/mise/shims/pitchfork"),
  join(home, ".local/bin/pitchfork"),
  join(home, ".cargo/bin/pitchfork"),
  "/opt/homebrew/bin/pitchfork",
  "/usr/local/bin/pitchfork",
];

export class MissingBinaryError extends Error {}

function isExecutable(path: string) {
  try {
    accessSync(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function binary(): string {
  const { binary } = getPreferenceValues<Preferences>();
  const path = binary?.trim() ? binary.trim().replace(/^~(?=\/)/, home) : CANDIDATES.find(isExecutable);
  if (!path || !isExecutable(path)) {
    throw new MissingBinaryError(
      path ? `${path} is not executable.` : "Could not find pitchfork. Set its path in the extension preferences.",
    );
  }
  return path;
}

function run(file: string, args: string[], { timeout = 30_000 } = {}): Promise<string> {
  const bin = dirname(file);
  // Raycast's PATH lacks mise and Homebrew; never let a call spawn a supervisor with that environment.
  const env = {
    ...process.env,
    PATH: [bin, "/opt/homebrew/bin", "/usr/local/bin", process.env.PATH].join(":"),
    PITCHFORK_SUPERVISOR_AUTO_START: "false",
  };
  return new Promise((resolve, reject) => {
    execFile(file, args, { cwd: home, env, timeout, maxBuffer: 16 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || stdout.trim() || error.message));
      else resolve(stdout);
    });
  });
}

export async function listDaemons(): Promise<Daemon[]> {
  const daemons = decode(await run(binary(), ["list", "--json"]));
  const pids = daemons.filter((d) => d.status === "running" && Number.isInteger(d.pid)).map((d) => d.pid);
  if (!pids.length) return daemons;
  // ps exits non-zero when any pid is gone but still prints the rest.
  const ps = await new Promise<string>((resolve) =>
    execFile("/bin/ps", ["-o", "pid=,etime=", "-p", pids.join(",")], (_, stdout) => resolve(stdout ?? "")),
  );
  const elapsed = new Map(
    ps
      .split("\n")
      .map((line) => line.trim().split(/\s+/))
      .filter(([pid, etime]) => pid && etime)
      .map(([pid, etime]) => [Number(pid), formatElapsed(etime)]),
  );
  return daemons.map((d) => (d.pid && elapsed.has(d.pid) ? { ...d, uptime: elapsed.get(d.pid) } : d));
}

export async function control(action: Action, ids: string[]): Promise<void> {
  // Start waits for Pitchfork's ready checks.
  await run(binary(), [action, "--", ...ids], { timeout: 600_000 });
}

export async function readLogs(id: string, lines = 300): Promise<string> {
  return run(binary(), ["logs", "-n", String(lines), "--raw", "--", id]);
}

export async function startSupervisor(): Promise<void> {
  // An interactive login shell loads .zprofile and .zshrc, so the supervisor and its daemons get the Terminal environment.
  const shell = process.env.SHELL || "/bin/zsh";
  await new Promise<void>((resolve, reject) =>
    execFile(
      shell,
      ["-i", "-l", "-c", `exec '${binary().replace(/'/g, "'\\''")}' supervisor start`],
      { cwd: home, timeout: 60_000 },
      (error, _, stderr) => (error ? reject(new Error(stderr.trim() || error.message)) : resolve()),
    ),
  );
}
