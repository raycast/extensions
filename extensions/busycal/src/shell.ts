import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Executes a process and returns trimmed stdout.
 *
 * - Parameters:
 *   - command: Executable name or absolute path.
 *   - args: Process arguments passed as-is.
 * - Returns: Trimmed standard output.
 * - Throws: Any process-launch or non-zero-exit failure surfaced by `execFile`.
 */
export async function execFileText(
  command: string,
  args: string[],
): Promise<string> {
  const { stdout } = await execFileAsync(command, args, {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });

  return stdout.trim();
}

/**
 * Executes a process with optional stdin and returns trimmed stdout.
 *
 * - Parameter input: Command, arguments, and optional stdin payload.
 * - Returns: Trimmed standard output.
 * - Throws: A process error or a synthesized error containing standard error text.
 */
export async function execProcessText(input: {
  command: string;
  args: string[];
  stdin?: string;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(input.command, input.args, {
      stdio: "pipe",
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(
        new Error(
          stderr.trim() || `${input.command} exited with code ${exitCode}.`,
        ),
      );
    });

    // `osascript -` and BusyCal's helper commands both expect a closed stdin to
    // begin execution, so the stream is always ended even when no stdin payload
    // is provided.
    if (input.stdin) {
      child.stdin.write(input.stdin);
    }
    child.stdin.end();
  });
}
