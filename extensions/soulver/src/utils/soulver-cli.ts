import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Common paths for soulver CLI on macOS
const KNOWN_PATHS = ["/opt/homebrew/bin/soulver", "/usr/local/bin/soulver", "/usr/bin/soulver", "soulver"];

let cachedSoulverPath: string | null = null;

export function findSoulverBinary(): string {
  if (cachedSoulverPath && (cachedSoulverPath === "soulver" || existsSync(cachedSoulverPath))) {
    return cachedSoulverPath;
  }

  for (const path of KNOWN_PATHS) {
    if (path === "soulver" || existsSync(path)) {
      cachedSoulverPath = path;
      return path;
    }
  }

  return "soulver";
}

export interface ExecOptions {
  env?: Record<string, string>;
}

export async function runSoulverCli(args: string[], options: ExecOptions = {}): Promise<string> {
  const binary = findSoulverBinary();

  // Ensure default PATHs are searched if invoking simple command
  const env = {
    ...process.env,
    PATH: `${process.env.PATH || ""}:/opt/homebrew/bin:/usr/local/bin:/usr/bin`,
    ...options.env,
  };

  try {
    const { stdout } = await execFileAsync(binary, args, {
      env,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (error: unknown) {
    const err = error as { stderr?: string; message?: string; code?: string | number };
    if (err.code === "ENOENT" || (err.message && err.message.includes("ENOENT"))) {
      throw new Error(
        "Soulver CLI (`soulver`) is not installed or not found on PATH. Please visit https://github.com/soulverteam/Soulver-CLI for installation instructions.",
      );
    }
    const errorMessage = err.stderr?.trim() || err.message || "Unknown error executing soulver CLI";
    throw new Error(`Soulver CLI Error: ${errorMessage}`);
  }
}

export async function runSoulverJson<T>(args: string[], options: ExecOptions = {}): Promise<T> {
  const fullArgs = [...args];
  if (!fullArgs.includes("--json")) {
    fullArgs.push("--json");
  }

  const rawOutput = await runSoulverCli(fullArgs, options);

  if (!rawOutput) {
    return [] as unknown as T;
  }

  try {
    return JSON.parse(rawOutput) as T;
  } catch {
    throw new Error(`Failed to parse Soulver CLI JSON response: ${rawOutput}`);
  }
}

export async function evaluateExpression(expression: string): Promise<string> {
  return await runSoulverCli([expression]);
}
