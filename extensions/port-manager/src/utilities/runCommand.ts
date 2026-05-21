import { spawn } from "child_process";

type RunCommandOptions = {
  timeout?: number;
  killProcessGroup?: boolean;
  maxBuffer?: number;
};

type CommandResult = {
  stdout: string;
  stderr: string;
};

const DEFAULT_MAX_BUFFER = 1024 * 1024;
const KILL_GRACE_PERIOD = 500;
const CLOSE_GRACE_PERIOD = 2_000;

export class CommandExitError extends Error {
  constructor(
    public readonly file: string,
    public readonly args: string[],
    public readonly stdout: string,
    public readonly stderr: string,
    public readonly exitCode: number | null,
    public readonly signal: NodeJS.Signals | null
  ) {
    super(stderr || stdout || `${file} exited with code ${exitCode ?? signal}`);
  }
}

export class CommandTimeoutError extends Error {
  constructor(public readonly file: string, public readonly args: string[], public readonly timeout: number) {
    super(`${file} timed out after ${timeout}ms`);
  }
}

export class CommandBufferError extends Error {
  constructor(public readonly file: string, public readonly args: string[], public readonly maxBuffer: number) {
    super(`${file} exceeded ${maxBuffer} bytes of output`);
  }
}

export function runCommand(file: string, args: string[], options: RunCommandOptions = {}): Promise<CommandResult> {
  const { timeout, killProcessGroup = false, maxBuffer = DEFAULT_MAX_BUFFER } = options;
  const detached = killProcessGroup && process.platform !== "win32";

  return new Promise((resolve, reject) => {
    const child = spawn(file, args, {
      detached,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let outputSize = 0;
    let settled = false;
    let timedOut = false;
    let failure: Error | undefined;
    let timeoutId: NodeJS.Timeout | undefined;
    let killId: NodeJS.Timeout | undefined;
    let closeId: NodeJS.Timeout | undefined;

    function cleanup() {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (killId !== undefined) clearTimeout(killId);
      if (closeId !== undefined) clearTimeout(closeId);
    }

    function killChild(signal: NodeJS.Signals) {
      if (child.pid === undefined) return;

      if (detached) {
        sendSignal(-child.pid, signal);
      }

      try {
        child.kill(signal);
      } catch {
        return;
      }
    }

    function sendSignal(pid: number, signal: NodeJS.Signals) {
      try {
        process.kill(pid, signal);
        return true;
      } catch {
        return false;
      }
    }

    function finish(error: Error) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    }

    function terminate(error: Error) {
      failure = error;
      killChild("SIGTERM");
      killId = setTimeout(() => killChild("SIGKILL"), KILL_GRACE_PERIOD);
      closeId = setTimeout(() => finish(error), CLOSE_GRACE_PERIOD);
    }

    function appendOutput(chunk: Buffer, target: "stdout" | "stderr") {
      outputSize += chunk.length;
      if (outputSize > maxBuffer && failure === undefined) {
        terminate(new CommandBufferError(file, args, maxBuffer));
      }

      if (target === "stdout") {
        stdout += chunk.toString();
      } else {
        stderr += chunk.toString();
      }
    }

    child.stdout?.on("data", (chunk: Buffer) => appendOutput(chunk, "stdout"));
    child.stderr?.on("data", (chunk: Buffer) => appendOutput(chunk, "stderr"));

    child.on("error", (error) => {
      finish(error);
    });

    child.on("close", (exitCode, signal) => {
      if (settled) return;
      settled = true;

      cleanup();

      if (failure !== undefined) {
        reject(failure);
        return;
      }

      if (timedOut) {
        reject(new CommandTimeoutError(file, args, timeout ?? 0));
        return;
      }

      if (exitCode !== 0) {
        reject(new CommandExitError(file, args, stdout.trimEnd(), stderr.trimEnd(), exitCode, signal));
        return;
      }

      resolve({ stdout: stdout.trimEnd(), stderr: stderr.trimEnd() });
    });

    if (timeout !== undefined) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        terminate(new CommandTimeoutError(file, args, timeout));
      }, timeout);
    }
  });
}
