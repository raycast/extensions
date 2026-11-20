import { spawn } from "child_process";

const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

export interface ProcessLifetimeOptions {
  timeout: number;
  maxBuffer?: number;
  env?: NodeJS.ProcessEnv;
  lockFileDescriptor?: number;
}

export interface ProcessLifetimeResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  outputLimitExceeded: boolean;
}

/**
 * Run a detached supervisor while keeping the parent alive through its result.
 * The supervisor's stdin is a lifeline: ending it asks the supervisor to tear
 * down the process group it owns before releasing any inherited lock.
 */
export function runProcessWithLifetime(
  file: string,
  args: string[],
  options: ProcessLifetimeOptions,
): Promise<ProcessLifetimeResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      detached: true,
      env: options.env,
      stdio: [
        "pipe",
        "pipe",
        "pipe",
        ...(options.lockFileDescriptor === undefined ? [] : [options.lockFileDescriptor]),
      ],
    });

    const maxBuffer = options.maxBuffer ?? DEFAULT_MAX_BUFFER;
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let outputLimitExceeded = false;
    let lifelineClosed = false;
    let spawnError: Error | undefined;

    const closeLifeline = () => {
      if (lifelineClosed) return;
      lifelineClosed = true;
      child.stdin?.end();
    };

    const append = (current: string, chunk: Buffer | string): string => {
      const text = chunk.toString();
      if (Buffer.byteLength(current) + Buffer.byteLength(text) > maxBuffer) {
        outputLimitExceeded = true;
        closeLifeline();
        return current;
      }
      return current + text;
    };

    const timer = setTimeout(() => {
      timedOut = true;
      closeLifeline();
    }, options.timeout);

    child.stdin?.on("error", () => {
      // The supervisor may exit while the timeout callback is closing stdin.
    });
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: Buffer | string) => {
      stdout = append(stdout, chunk);
    });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: Buffer | string) => {
      stderr = append(stderr, chunk);
    });
    child.once("error", (error) => {
      spawnError = error;
    });
    child.once("close", (exitCode, signal) => {
      clearTimeout(timer);
      if (spawnError) {
        reject(spawnError);
      } else {
        resolve({ stdout, stderr, exitCode, signal, timedOut, outputLimitExceeded });
      }
    });
  });
}
