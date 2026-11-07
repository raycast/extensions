import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface PowerShellOptions {
  timeoutMs?: number;
  maxBuffer?: number;
}

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024; // 10MB

/**
 * Converts a PowerShell script string to UTF-16LE Base64 encoding for `-EncodedCommand`.
 */
export function encodePowerShellScript(script: string): string {
  return Buffer.from(script, "utf16le").toString("base64");
}

/**
 * Executes a PowerShell command or script using Base64 encoded UTF-16LE payload.
 * Runs with -NoProfile -NonInteractive -ExecutionPolicy Bypass and windowsHide: true.
 */
export async function runPowerShell(
  script: string,
  options?: PowerShellOptions,
): Promise<string> {
  if (process.platform !== "win32") {
    throw new Error(
      `PowerShell execution is only supported on Windows (current platform: ${process.platform})`,
    );
  }

  const encoded = encodePowerShellScript(script);
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-ExecutionPolicy",
    "Bypass",
    "-EncodedCommand",
    encoded,
  ];

  const timeout = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBuffer = options?.maxBuffer ?? DEFAULT_MAX_BUFFER;

  try {
    const { stdout, stderr } = await execFileAsync("powershell.exe", args, {
      windowsHide: true,
      timeout,
      maxBuffer,
      encoding: "utf8",
    });

    if (stderr && stderr.trim().length > 0) {
      // Some scripts print benign warnings to stderr; if stdout is present we proceed, otherwise log
      if (!stdout || stdout.trim().length === 0) {
        console.warn("PowerShell stderr:", stderr.trim());
      }
    }

    // Strip UTF-8 BOM if present
    const cleanOutput = stdout.replace(/^\uFEFF/, "").trim();
    return cleanOutput;
  } catch (error: unknown) {
    const err = error as Error & { code?: string | number; stderr?: string };
    const errMsg = err.stderr ? err.stderr.trim() : err.message;
    throw new Error(`PowerShell execution failed: ${errMsg}`);
  }
}

/**
 * Executes a PowerShell script that returns JSON, parses and returns typed result.
 */
export async function runPowerShellJson<T>(
  script: string,
  options?: PowerShellOptions,
): Promise<T> {
  const output = await runPowerShell(script, options);
  if (!output || output.trim().length === 0) {
    throw new Error(
      "PowerShell command returned empty output when JSON was expected",
    );
  }

  // Find valid JSON start ({ or [) to ignore any leading warnings
  const jsonStartBrace = output.indexOf("{");
  const jsonStartBracket = output.indexOf("[");
  let startIndex = -1;

  if (jsonStartBrace !== -1 && jsonStartBracket !== -1) {
    startIndex = Math.min(jsonStartBrace, jsonStartBracket);
  } else if (jsonStartBrace !== -1) {
    startIndex = jsonStartBrace;
  } else if (jsonStartBracket !== -1) {
    startIndex = jsonStartBracket;
  }

  const jsonCandidate =
    startIndex !== -1 ? output.substring(startIndex) : output;

  try {
    return JSON.parse(jsonCandidate) as T;
  } catch (parseError) {
    throw new Error(
      `Failed to parse PowerShell JSON output: ${(parseError as Error).message}\nRaw Output: ${output.substring(0, 300)}`,
    );
  }
}
