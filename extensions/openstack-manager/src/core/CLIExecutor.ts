import { execFile as execFileCb } from "child_process";
import { promisify } from "util";
import { CLIError, BinaryNotFoundError } from "./errors";
import { normalizeKeys } from "./normalizeKeys";

const execFile = promisify(execFileCb);

const DEFAULT_TIMEOUT_MS = 30_000;

export interface CLIRunOptions {
  timeoutMs?: number; // default: 30_000
}

export class CLIExecutor {
  constructor(
    private readonly binaryPath: string,
    private readonly cloudName: string,
  ) {}

  /**
   * Runs: <binaryPath> --os-cloud <cloudName> ...args -f json
   * Returns parsed JSON output.
   * Throws CLIError on non-zero exit code or binary not found.
   */
  async run<T>(args: string[], options?: CLIRunOptions): Promise<T> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const fullArgs = ["--os-cloud", this.cloudName, ...args, "-f", "json"];

    let stdout: string;
    try {
      const result = await execFile(this.binaryPath, fullArgs, {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });
      stdout = result.stdout;
    } catch (error: unknown) {
      this.handleExecError(error, fullArgs);
      // handleExecError always throws, but TypeScript doesn't know that
      throw error;
    }

    try {
      return normalizeKeys<T>(JSON.parse(stdout));
    } catch {
      throw new CLIError(`Failed to parse JSON output from openstack CLI: ${stdout}`, 0, stdout, fullArgs);
    }
  }

  /**
   * Runs a mutating command (start/stop/reboot) that produces no JSON output.
   * Throws CLIError on non-zero exit code.
   */
  async exec(args: string[], options?: CLIRunOptions): Promise<void> {
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const fullArgs = ["--os-cloud", this.cloudName, ...args];

    try {
      await execFile(this.binaryPath, fullArgs, {
        timeout: timeoutMs,
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (error: unknown) {
      this.handleExecError(error, fullArgs);
    }
  }

  private handleExecError(error: unknown, fullArgs: string[]): never {
    // ENOENT means the binary was not found on the system
    if (isExecError(error) && error.code === "ENOENT") {
      throw new BinaryNotFoundError(this.binaryPath);
    }

    // Non-zero exit code or other execFile errors
    if (isExecError(error)) {
      const exitCode = typeof error.code === "number" ? error.code : null;
      throw new CLIError(error.stderr || error.message, exitCode, error.stderr || "", fullArgs);
    }

    // Re-throw unknown errors wrapped in CLIError
    const message = error instanceof Error ? error.message : String(error);
    throw new CLIError(message, null, "", fullArgs);
  }
}

interface ExecError extends Error {
  code?: string | number;
  stderr: string;
  stdout: string;
  killed?: boolean;
  signal?: string | null;
}

function isExecError(error: unknown): error is ExecError {
  return error instanceof Error && "code" in error;
}
