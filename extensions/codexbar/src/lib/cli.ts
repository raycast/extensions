import { execFile } from "child_process";
import { existsSync } from "fs";
import { CLI_CANDIDATES } from "./constants";

export class CliNotFoundError extends Error {
  constructor() {
    super("CodexBar is not installed");
    this.name = "CliNotFoundError";
  }
}

export function findCli(candidates: string[] = CLI_CANDIDATES): string | undefined {
  return candidates.find((candidate) => existsSync(candidate));
}

/**
 * Runs the CodexBar CLI and parses its JSON stdout. The CLI exits with code 1 when any single
 * provider fails but still prints the full JSON array, so a parseable stdout wins over the exit code.
 */
export function runCliJson(
  args: string[],
  timeoutMs: number,
  cliPath: string | null = findCli() ?? null,
): Promise<unknown> {
  if (!cliPath) return Promise.reject(new CliNotFoundError());
  return new Promise((resolve, reject) => {
    execFile(
      cliPath,
      args,
      { timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, NO_COLOR: "1" } },
      (error, stdout, stderr) => {
        const output = stdout.trim();
        if (output) {
          try {
            resolve(JSON.parse(output));
            return;
          } catch {
            // fall through to the error below
          }
        }
        if (error && "killed" in error && error.killed) {
          reject(new Error(`CodexBar CLI timed out after ${Math.round(timeoutMs / 1000)}s`));
          return;
        }
        const detail = stderr.trim().split("\n").pop();
        reject(new Error(detail || error?.message || "CodexBar CLI returned no data"));
      },
    );
  });
}
