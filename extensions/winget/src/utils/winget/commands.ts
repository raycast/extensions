import { execFile } from "child_process";
import { promisify } from "util";
import { getPreferenceValues } from "@raycast/api";

const execFileAsync = promisify(execFile);

/**
 * Strip ANSI/VT escape codes that winget emits for color and progress.
 * Also removes the Unicode right-to-left mark (U+200F) that occasionally
 * appears in winget output on some Windows builds.
 */
function stripAnsi(str: string): string {
  return str
    .replace(/\x1B\[[0-9;]*[mGKHFJABCDEFnstu]/g, "")
    .replace(/\x1B[=>]/g, "")
    .replace(/\u200F/g, "");
}

function getWingetExecutable(): string {
  const { wingetPath } = getPreferenceValues<Preferences>();
  return wingetPath?.trim() || "winget";
}

function handleExecError(error: unknown, executable: string): never {
  if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "ENOENT") {
    throw new Error(
      `winget executable not found ("${executable}"). ` +
        `Make sure winget is installed, or set the correct path in Extension Preferences → Winget Executable Path.`,
    );
  }
  throw error;
}

/** Shared execFileAsync call with consistent options. */
async function runExec(executable: string, args: string[]) {
  return execFileAsync(executable, args, {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

/**
 * Execute a winget command and return its stdout as a plain string.
 * Non-zero exit codes are tolerated when winget still writes useful output
 * to stdout (e.g. "No package found" exits with code 1).
 */
export async function execWinget(args: string[]): Promise<string> {
  const executable = getWingetExecutable();
  try {
    const { stdout } = await runExec(executable, args);
    return stripAnsi(stdout);
  } catch (error: unknown) {
    // execFile rejects on non-zero exit code, but stdout may still contain data
    if (error && typeof error === "object" && "stdout" in error) {
      const stdout = (error as { stdout: string }).stdout;
      if (typeof stdout === "string" && stdout.length > 0) {
        return stripAnsi(stdout);
      }
    }
    handleExecError(error, executable);
  }
}

/**
 * Like execWinget but also returns the exit code.
 * Used when the caller needs to distinguish partial failures from full success
 * (e.g. `winget upgrade --all` exits non-zero when some packages fail).
 */
export async function execWingetWithCode(args: string[]): Promise<{ output: string; exitCode: number }> {
  const executable = getWingetExecutable();
  try {
    const { stdout } = await runExec(executable, args);
    return { output: stripAnsi(stdout), exitCode: 0 };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "stdout" in error) {
      const raw = error as { stdout: string; code?: number };
      if (typeof raw.stdout === "string" && raw.stdout.length > 0) {
        return { output: stripAnsi(raw.stdout), exitCode: raw.code ?? 1 };
      }
    }
    handleExecError(error, executable);
  }
}
