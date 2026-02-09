import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type RunOptions = {
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 15_000;

export async function runShortcut(
  name: string,
  input?: unknown,
  options?: RunOptions
): Promise<void> {
  const args = ["run", name];
  let inputPath: string | null = null;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  try {
    if (input !== undefined) {
      inputPath = path.join(
        os.tmpdir(),
        `raycast-shortcut-input-${Date.now()}.txt`
      );
      const contents =
        typeof input === "string" ||
        typeof input === "number" ||
        typeof input === "boolean"
          ? String(input)
          : JSON.stringify(input);
      await fs.writeFile(inputPath, contents, { encoding: "utf8" });
      args.push("--input-path", inputPath);
    }
    try {
      const execOptions: { timeout?: number } = {};
      if (timeoutMs > 0) {
        execOptions.timeout = timeoutMs;
      }
      await execFileAsync("/usr/bin/shortcuts", args, execOptions);
    } catch (error) {
      const err = error as {
        stderr?: string;
        stdout?: string;
        code?: string | number;
        signal?: string;
        message?: string;
      };
      const stderr = err.stderr ? String(err.stderr).trim() : "";
      const stdout = err.stdout ? String(err.stdout).trim() : "";
      const code = err.code ? ` (code ${err.code})` : "";
      const signal = err.signal ? ` (signal ${err.signal})` : "";
      const timeoutNote =
        err.signal === "SIGTERM" && timeoutMs > 0
          ? ` (timeout ${timeoutMs}ms)`
          : "";
      const detail = [stderr, stdout].filter(Boolean).join(" | ");
      const base = err.message ? err.message : "Shortcuts command failed";
      throw new Error(
        `${base}${code}${signal}${timeoutNote}${detail ? `: ${detail}` : ""}`
      );
    }
  } finally {
    if (inputPath) {
      await fs.unlink(inputPath).catch(() => undefined);
    }
  }
}
