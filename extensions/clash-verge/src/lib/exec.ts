import { spawn } from "child_process";

const DEFAULT_TIMEOUT_MS = 10_000;

export interface ExecOptions {
  timeoutMs?: number;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdin?: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export class CommandExecutionError extends Error {
  command: string;
  args: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  cause?: unknown;

  constructor(params: {
    command: string;
    args: string[];
    exitCode: number | null;
    stdout: string;
    stderr: string;
    timedOut?: boolean;
    cause?: unknown;
  }) {
    const baseMessage = formatCommand(params.command, params.args);
    const detail = params.stderr.trim() || params.stdout.trim() || "Unknown command failure";
    super(`Command failed: ${baseMessage}\n${detail}`);
    this.name = "CommandExecutionError";
    this.command = params.command;
    this.args = params.args;
    this.exitCode = params.exitCode;
    this.stdout = params.stdout;
    this.stderr = params.stderr;
    this.timedOut = Boolean(params.timedOut);
    this.cause = params.cause;
  }
}

export async function execCommand(command: string, args: string[], options: ExecOptions = {}): Promise<ExecResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const env = createExecEnv(options.env);

  return await new Promise<ExecResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env,
      shell: false,
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(
        new CommandExecutionError({
          command,
          args,
          exitCode: null,
          stdout,
          stderr,
          timedOut,
          cause: error,
        }),
      );
    });

    child.on("close", (exitCode) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeout);

      if (exitCode === 0 && !timedOut) {
        resolve({
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: 0,
        });
        return;
      }

      reject(
        new CommandExecutionError({
          command,
          args,
          exitCode,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          timedOut,
        }),
      );
    });

    if (options.stdin !== undefined) {
      child.stdin.write(options.stdin);
      child.stdin.end();
    }
  });
}

function createExecEnv(extraEnv?: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const path = process.env.PATH ?? "";
  const requiredPaths = ["/usr/local/bin", "/opt/homebrew/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"];
  const mergedPath = [...new Set([...path.split(":"), ...requiredPaths].filter(Boolean))].join(":");

  return {
    ...process.env,
    ...extraEnv,
    PATH: mergedPath,
  };
}

function formatCommand(command: string, args: string[]): string {
  const escaped = args.map((arg) => (arg.includes(" ") ? `"${arg}"` : arg));
  return [command, ...escaped].join(" ");
}
