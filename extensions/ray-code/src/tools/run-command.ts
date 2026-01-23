import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getWorkspaceRoot, resolveAndValidatePath } from "../utils/workspace";
import { getShellEnv, EXEC_ENV_OVERRIDES } from "../utils/shell";

const execFileAsync = promisify(execFile);

type Input = {
  /**
   * The shell command to execute
   */
  command: string;
  /**
   * Optional: Working directory relative to workspace root (defaults to workspace root)
   */
  cwd?: string;
  /**
   * Optional: Timeout in milliseconds (defaults to 30000ms / 30 seconds)
   */
  timeout?: number;
};

const MAX_OUTPUT = 10000;
const DEFAULT_TIMEOUT = 30000;

/**
 * Confirmation is always required for run-command (not affected by autoEdit preference)
 * This is a security measure since shell commands can have significant side effects
 */
export async function confirmation({ command, cwd }: Input) {
  return {
    message: "Execute shell command?",
    info: [
      { name: "Command", value: command },
      { name: "Working Directory", value: cwd || "(workspace root)" },
    ],
  };
}

/**
 * Truncate output to prevent extremely large responses
 */
function truncateOutput(output: string, maxLength: number): string {
  if (output.length <= maxLength) return output;
  return output.slice(0, maxLength) + `\n... (truncated, ${output.length - maxLength} more characters)`;
}

export default async function ({ command, cwd, timeout = DEFAULT_TIMEOUT }: Input) {
  if (!command || command.trim() === "") {
    throw new Error("Command is required");
  }

  const workspaceRoot = getWorkspaceRoot();
  const workingDir = cwd ? resolveAndValidatePath(cwd) : workspaceRoot;

  const shellEnv = await getShellEnv();

  try {
    const { stdout, stderr } = await execFileAsync(shellEnv.shell, ["-l", "-c", command], {
      cwd: workingDir,
      timeout,
      maxBuffer: 1024 * 1024 * 5, // 5MB buffer
      env: {
        ...shellEnv.env,
        ...EXEC_ENV_OVERRIDES,
      },
    });

    return {
      success: true,
      exitCode: 0,
      stdout: truncateOutput(stdout, MAX_OUTPUT),
      stderr: truncateOutput(stderr, MAX_OUTPUT),
    };
  } catch (error: unknown) {
    const execError = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
      message?: string;
      killed?: boolean;
    };

    // Check if command was killed due to timeout
    if (execError.killed) {
      return {
        success: false,
        exitCode: -1,
        stdout: truncateOutput(execError.stdout || "", MAX_OUTPUT),
        stderr: `Command timed out after ${timeout}ms`,
        timedOut: true,
      };
    }

    return {
      success: false,
      exitCode: execError.code || 1,
      stdout: truncateOutput(execError.stdout || "", MAX_OUTPUT),
      stderr: truncateOutput(execError.stderr || execError.message || "Unknown error", MAX_OUTPUT),
    };
  }
}
