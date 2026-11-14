// A thin client for the portcheck CLI's JSON output, like the VS Code and
// JetBrains extensions: no port logic here, only `portcheck … --json`.
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface ProcessInfo {
  pid: number;
  name: string;
  user?: string;
  cmdline?: string;
  startTime?: string;
  ancestors?: { pid: number; name: string }[];
}

export interface ContainerInfo {
  id?: string;
  name?: string;
  image?: string;
  runtime: string;
  stopHint: string;
}

export interface Socket {
  proto: string;
  localAddress: string;
  localPort: number;
  pid?: number;
  process?: ProcessInfo;
  container?: ContainerInfo;
}

export interface ListData {
  sockets: Socket[];
  partial: boolean;
}

export interface CheckData {
  ports: { port: number; proto: string; status: "free" | "in-use" | "denied"; holders: Socket[] }[];
}

export interface FreeData {
  ports: number[];
}

export interface KillData {
  results: { pid: number; name?: string; outcome: string; error?: string }[];
}

export class PortcheckError extends Error {
  constructor(
    message: string,
    readonly missing = false,
  ) {
    super(message);
    this.name = "PortcheckError";
  }
}

/** Where portcheck is usually installed; Raycast doesn't see the shell's PATH. */
export function candidates(home: string, path: string | undefined): string[] {
  return [
    "/opt/homebrew/bin/portcheck",
    "/usr/local/bin/portcheck",
    join(home, ".local", "bin", "portcheck"),
    join(home, "go", "bin", "portcheck"),
    ...(path ?? "")
      .split(":")
      .filter(Boolean)
      .map((dir) => join(dir, "portcheck")),
  ];
}

/** The binary: the preference if set, else the first install location that exists. */
export function resolveBinary(configured: string | undefined, exists: (p: string) => boolean = existsSync): string {
  if (configured?.trim()) {
    return configured.trim();
  }
  const found = candidates(homedir(), process.env.PATH).find(exists);
  if (!found) {
    throw new PortcheckError(
      "portcheck isn't installed. Install it with `brew install roystondwork-dev/tap/portcheck`, or set its path in the extension's preferences.",
      true,
    );
  }
  return found;
}

export type Exec = (file: string, args: string[]) => Promise<{ stdout: string; stderr: string; code: number }>;

const realExec: Exec = (file, args) =>
  new Promise((resolve, reject) => {
    execFile(file, args, { timeout: 15_000 }, (err, stdout, stderr) => {
      if (err && typeof err.code !== "number") {
        reject(new PortcheckError(`portcheck couldn't be started: ${err.message}`, err.code === "ENOENT"));
        return;
      }
      resolve({ stdout, stderr, code: typeof err?.code === "number" ? err.code : 0 });
    });
  });

/** Runs portcheck with --json; exit codes in ok are answers (1 = "in use" for check). */
export async function run<T>(
  binary: string,
  kind: string,
  args: string[],
  ok: number[] = [0],
  exec: Exec = realExec,
): Promise<T> {
  const r = await exec(binary, [...args, "--json"]);
  const out = r.stdout.trim();
  if (!ok.includes(r.code) || out === "") {
    const line = r.stderr
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l !== "");
    throw new PortcheckError(line?.replace(/^portcheck: /, "") ?? `portcheck exited with status ${r.code}`);
  }
  let env: { schemaVersion?: number; kind?: string; data?: T };
  try {
    env = JSON.parse(out) as typeof env;
  } catch {
    throw new PortcheckError(`portcheck printed invalid JSON for "${kind}"`);
  }
  if (env.schemaVersion !== 1 || env.kind !== kind || env.data === undefined) {
    throw new PortcheckError(
      `unexpected output from portcheck (schema ${env.schemaVersion}, kind ${env.kind}); update portcheck`,
    );
  }
  return env.data;
}

export const list = (bin: string, exec?: Exec) => run<ListData>(bin, "list", ["list", "--listening"], [0, 4], exec);
export const check = (bin: string, port: number, exec?: Exec) =>
  run<CheckData>(bin, "check", ["check", String(port)], [0, 1], exec);
export const free = (bin: string, range: string | undefined, exec?: Exec) =>
  run<FreeData>(bin, "free", range ? ["free", range] : ["free"], [0, 1], exec);
export const kill = (bin: string, pid: number, exec?: Exec) =>
  run<KillData>(bin, "kill", ["kill", "--pid", String(pid), "--yes"], [0, 1, 3, 4], exec);
