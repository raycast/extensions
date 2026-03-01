import { spawn } from "node:child_process";
import type { SpawnOptions } from "node:child_process";
import type { ExtensionPreferences } from "./preferences";

export interface CliErrorEnvelope {
  error: string;
  message: string;
  details?: Record<string, unknown>;
}

export class CliExecutionError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly exitCode: number;

  constructor(code: string, message: string, exitCode = 1, details?: Record<string, unknown>) {
    super(message);
    this.name = "CliExecutionError";
    this.code = code;
    this.exitCode = exitCode;
    this.details = details;
  }
}

export interface ExecuteCliOptions {
  cliPath: string;
  args: string[];
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
  cwd?: string;
}

type CliExecutor = (options: ExecuteCliOptions) => Promise<unknown>;
export type AgentWalletRun = (argv?: string[]) => Promise<number> | number;
type BundledRunResolver = () => Promise<AgentWalletRun | null>;
type BundledCliRunner = (
  args: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
  runFn: AgentWalletRun,
) => Promise<unknown>;

export async function runZbdw(args: string[], timeoutMs = 30_000): Promise<unknown> {
  const { readPreferences } = await import("./preferences");
  const prefs = readPreferences();

  return runZbdwWithPreferences(args, prefs, timeoutMs);
}

export async function runZbdwWithPreferences(
  args: string[],
  prefs: ExtensionPreferences,
  timeoutMs = 30_000,
  executor: CliExecutor = executeCli,
  bundledRunResolver: BundledRunResolver = resolveBundledRunFunction,
  bundledCliRunner: BundledCliRunner = executeBundledCliInProcess,
): Promise<unknown> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ZBD_API_KEY: prefs.apiKey,
  };

  if (prefs.apiBaseUrl) {
    env.ZBD_API_BASE_URL = prefs.apiBaseUrl;
  }

  if (prefs.aiBaseUrl) {
    env.ZBD_AI_BASE_URL = prefs.aiBaseUrl;
  }

  if (prefs.cliPath) {
    return executor({
      cliPath: prefs.cliPath,
      args,
      env,
      timeoutMs,
    });
  }

  const attempts: ExecuteCliOptions[] = [];
  let spawnError: CliExecutionError | null = null;

  const zbdwAttempt: ExecuteCliOptions = {
    cliPath: "zbdw",
    args,
    env,
    timeoutMs,
  };
  attempts.push(zbdwAttempt);

  try {
    return await executor(zbdwAttempt);
  } catch (error) {
    if (!isSpawnEnoent(error)) {
      throw error;
    }
    spawnError = error;
  }

  const bundledRun = await bundledRunResolver();
  if (bundledRun) {
    attempts.push({
      cliPath: "bundled:@zbdpay/agent-wallet/dist/cli.js",
      args,
      env,
      timeoutMs,
    });

    try {
      return await bundledCliRunner(args, env, timeoutMs, bundledRun);
    } catch (error) {
      if (!isBundledUnavailable(error)) {
        throw error;
      }
    }
  }

  if (spawnError) {
    throw withAttemptDetails(spawnError, attempts);
  }

  throw new CliExecutionError("spawn_failed", "Unable to execute zbdw", 1, {
    attempts: attempts.map((attempt) => ({
      cliPath: attempt.cliPath,
      args: attempt.args,
    })),
  });
}

async function resolveBundledRunFunction(): Promise<AgentWalletRun | null> {
  try {
    const module = (await import("@zbdpay/agent-wallet/dist/cli.js")) as {
      run?: AgentWalletRun;
    };
    if (typeof module.run === "function") {
      return module.run;
    }
  } catch (error) {
    ignoreError(error);
  }

  return null;
}

async function executeBundledCliInProcess(
  args: string[],
  env: NodeJS.ProcessEnv,
  _timeoutMs: number,
  runFn: AgentWalletRun,
): Promise<unknown> {
  const restoreEnv = applyEnvOverrides(env);
  const stdoutCapture = startStdoutCapture();

  try {
    const exitCodeRaw = await runFn(["node", "zbdw", ...args]);
    const exitCode = typeof exitCodeRaw === "number" ? exitCodeRaw : 1;
    const stdout = stdoutCapture.output();

    let parsed: unknown = null;
    if (stdout.length > 0) {
      try {
        parsed = JSON.parse(stdout) as unknown;
      } catch {
        throw new CliExecutionError("invalid_json", "CLI returned non-JSON stdout", exitCode, {
          stdout,
        });
      }
    }

    if (exitCode === 0) {
      return parsed;
    }

    const envelope = normalizeEnvelope(parsed);
    if (envelope) {
      throw new CliExecutionError(envelope.error, envelope.message, exitCode, envelope.details);
    }

    throw new CliExecutionError("cli_nonzero", "CLI exited with non-zero status", exitCode, {
      stdout,
    });
  } catch (error) {
    if (error instanceof CliExecutionError) {
      throw error;
    }

    throw new CliExecutionError(
      "bundled_cli_unavailable",
      error instanceof Error ? error.message : "Bundled CLI unavailable",
      1,
    );
  } finally {
    stdoutCapture.restore();
    restoreEnv();
  }
}

function startStdoutCapture(): { restore: () => void; output: () => string } {
  const writable = process.stdout as NodeJS.WriteStream & {
    write: (...args: unknown[]) => boolean;
  };
  const originalWrite = writable.write.bind(writable);
  const chunks: string[] = [];

  writable.write = ((chunk: unknown, encodingOrCallback?: unknown, callback?: unknown) => {
    chunks.push(asText(chunk, encodingOrCallback));

    if (typeof encodingOrCallback === "function") {
      (encodingOrCallback as () => void)();
      return true;
    }

    if (typeof callback === "function") {
      (callback as () => void)();
    }

    return true;
  }) as typeof writable.write;

  return {
    restore: () => {
      writable.write = originalWrite as typeof writable.write;
    },
    output: () => chunks.join("").trim(),
  };
}

function asText(chunk: unknown, encodingOrCallback?: unknown): string {
  if (typeof chunk === "string") {
    return chunk;
  }

  if (chunk instanceof Uint8Array) {
    const encoding = typeof encodingOrCallback === "string" ? encodingOrCallback : "utf8";
    return Buffer.from(chunk).toString(encoding as BufferEncoding);
  }

  return String(chunk);
}

function applyEnvOverrides(env: NodeJS.ProcessEnv): () => void {
  const keys = ["ZBD_API_KEY", "ZBD_API_BASE_URL", "ZBD_AI_BASE_URL"] as const;
  const previous = new Map<string, string | undefined>();

  for (const key of keys) {
    previous.set(key, process.env[key]);
    const nextValue = env[key];
    if (typeof nextValue === "string") {
      process.env[key] = nextValue;
    } else {
      delete process.env[key];
    }
  }

  return () => {
    for (const key of keys) {
      const value = previous.get(key);
      if (typeof value === "string") {
        process.env[key] = value;
      } else {
        delete process.env[key];
      }
    }
  };
}

function isSpawnEnoent(error: unknown): error is CliExecutionError {
  return error instanceof CliExecutionError && error.code === "spawn_failed" && error.message.includes("ENOENT");
}

function isBundledUnavailable(error: unknown): error is CliExecutionError {
  return error instanceof CliExecutionError && error.code === "bundled_cli_unavailable";
}

function withAttemptDetails(error: CliExecutionError, attempts: ExecuteCliOptions[]): CliExecutionError {
  return new CliExecutionError(error.code, error.message, error.exitCode, {
    ...(error.details ?? {}),
    attempts: attempts.map((attempt) => ({
      cliPath: attempt.cliPath,
      args: attempt.args,
    })),
  });
}

function ignoreError(_error: unknown): void {
  void _error;
}

export function executeCli(options: ExecuteCliOptions): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? 30_000;

  return new Promise((resolve, reject) => {
    const spawnOptions: SpawnOptions = {
      env: options.env,
      cwd: options.cwd,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    };

    const child = spawn(options.cliPath, options.args, spawnOptions);
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutMs);

    if (!child.stdout || !child.stderr) {
      clearTimeout(timeout);
      reject(new CliExecutionError("spawn_failed", "CLI process streams are unavailable", 1));
      return;
    }

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(new CliExecutionError("spawn_failed", error.message, 1));
    });

    child.on("close", (code, signal) => {
      clearTimeout(timeout);

      if (signal) {
        reject(new CliExecutionError("cli_signal", `CLI terminated by signal: ${signal}`, 1));
        return;
      }

      const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim();
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim();

      let parsed: unknown;
      if (stdout.length > 0) {
        try {
          parsed = JSON.parse(stdout) as unknown;
        } catch {
          reject(
            new CliExecutionError("invalid_json", "CLI returned non-JSON stdout", code ?? 1, {
              stdout,
              stderr,
            }),
          );
          return;
        }
      } else {
        parsed = null;
      }

      const exitCode = typeof code === "number" ? code : 1;
      if (exitCode === 0) {
        resolve(parsed);
        return;
      }

      const envelope = normalizeEnvelope(parsed);
      if (envelope) {
        reject(new CliExecutionError(envelope.error, envelope.message, exitCode, envelope.details));
        return;
      }

      reject(
        new CliExecutionError("cli_nonzero", "CLI exited with non-zero status", exitCode, {
          stdout,
          stderr,
        }),
      );
    });
  });
}

function normalizeEnvelope(value: unknown): CliErrorEnvelope | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.error !== "string" || typeof record.message !== "string") {
    return null;
  }

  const details =
    record.details && typeof record.details === "object" ? (record.details as Record<string, unknown>) : undefined;

  return {
    error: record.error,
    message: record.message,
    details,
  };
}
