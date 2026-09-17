import { execFile, spawn } from "node:child_process";
import { homedir } from "node:os";
import type { MiseLocation } from "./locate";

export class MiseOutputError extends Error {
  constructor(
    message: string,
    readonly raw: string,
  ) {
    super(message);
    this.name = "MiseOutputError";
  }
}

export class MiseExitError extends Error {
  constructor(
    readonly args: string[],
    readonly code: number | null,
    readonly stderr: string,
  ) {
    super(`mise ${args.join(" ")} exited with ${code ?? "signal"}: ${stderr.trim()}`);
    this.name = "MiseExitError";
  }
}

export type RunResult = { code: number | null; stdout: string; stderr: string };
export type RunOptions = { onLine?: (line: string) => void; signal?: AbortSignal };
export type CommandEvent = { args: string[]; code: number | null; ms: number };

let observer: ((event: CommandEvent) => void) | undefined;

export function observeCommands(next: ((event: CommandEvent) => void) | undefined): void {
  observer = next;
}

function envFor(location: MiseLocation): NodeJS.ProcessEnv {
  return { ...process.env, ...location.env };
}

function report(args: string[], code: number | null, startedAt: number): void {
  observer?.({ args, code, ms: Date.now() - startedAt });
}

export function miseJson<T>(location: MiseLocation, args: string[], parse: (raw: unknown) => T): Promise<T> {
  const fullArgs = [...args, "--json"];
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    execFile(
      location.path,
      fullArgs,
      { cwd: homedir(), env: envFor(location), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const code = error ? (typeof error.code === "number" ? error.code : null) : 0;
        report(fullArgs, code, startedAt);
        if (error) {
          reject(new MiseExitError(args, code, stderr || error.message));
          return;
        }
        let json: unknown;
        try {
          json = JSON.parse(stdout);
        } catch {
          reject(new MiseOutputError(`mise ${args.join(" ")} did not return JSON`, stdout));
          return;
        }
        try {
          resolve(parse(json));
        } catch (parseError) {
          reject(parseError);
        }
      },
    );
  });
}

export function runMise(location: MiseLocation, args: string[], options: RunOptions = {}): Promise<RunResult> {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const child = spawn(location.path, args, {
      cwd: homedir(),
      env: envFor(location),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let pending = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
      pending += chunk;
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) options.onLine?.(line);
    });
    const onAbort = () => child.kill("SIGTERM");
    options.signal?.addEventListener("abort", onAbort, { once: true });
    child.on("error", (error) => {
      options.signal?.removeEventListener("abort", onAbort);
      reject(error);
    });
    child.on("close", (code) => {
      options.signal?.removeEventListener("abort", onAbort);
      if (pending) options.onLine?.(pending);
      report(args, code, startedAt);
      resolve({ code, stdout, stderr });
    });
  });
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
