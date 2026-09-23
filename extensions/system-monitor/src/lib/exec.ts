import { execFile, spawn } from "child_process";
import { promisify } from "util";

const execFileP = promisify(execFile);

/** Generous enough for slow tools (nettop, system_profiler) while still
 *  bounding a stalled command so polling cycles cannot pile up behind it. */
const COMMAND_TIMEOUT_MS = 30_000;

/** Shell-free command execution. Uses execFile() instead of exec() to spawn
 *  binaries directly without /bin/sh, preventing zombie process accumulation. */
export const execf = async (file: string, args: string[] = [], maxBuffer?: number): Promise<string> => {
  const { stdout } = await execFileP(file, args, { timeout: COMMAND_TIMEOUT_MS, ...(maxBuffer ? { maxBuffer } : {}) });
  return String(stdout).trim();
};

/** Stream stdout and keep only the last N lines to avoid buffer overflows. */
export const execTail = async (file: string, args: string[] = [], tailLines = 500): Promise<string> => {
  return new Promise((resolve, reject) => {
    const proc = spawn(file, args, { stdio: ["ignore", "pipe", "ignore"], timeout: COMMAND_TIMEOUT_MS });
    const lines: string[] = [];
    let buffer = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString();
      const parts = buffer.split("\n");
      buffer = parts.pop() ?? "";

      for (const line of parts) {
        lines.push(line);
        if (lines.length > tailLines) {
          lines.shift();
        }
      }
    });

    proc.on("error", reject);

    proc.on("close", (code) => {
      if (buffer.length > 0) {
        lines.push(buffer);
        if (lines.length > tailLines) {
          lines.shift();
        }
      }

      if (code !== 0) {
        reject(new Error(`${file} exited with code ${code}`));
        return;
      }

      resolve(lines.join("\n").trim());
    });
  });
};
