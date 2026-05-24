import {
  execFile,
  spawn,
  type ChildProcessWithoutNullStreams,
} from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import { join } from "node:path";

const exec = promisify(execFile);

const NTN_BIN = join(homedir(), ".local", "bin", "ntn");

export type Worker = {
  workerId: string;
  name: string;
  spaceId: string;
  createdAt: string;
  updatedAt: string;
};

export type Capability = {
  _tag: "tool" | "sync" | "webhook" | "oauth";
  key: string;
  state: unknown;
  config: unknown;
};

export type Run = {
  workerId: string;
  spaceId: string;
  runId: string;
  name: string;
  exitCode: number | null;
  startedAt: string;
  endedAt: string | null;
};

export type EnvVar = {
  key: string;
  createdAt: string;
};

export type LogResult = {
  logs: string;
};

class NtnError extends Error {
  constructor(
    message: string,
    public readonly stderr: string,
    public readonly exitCode: number | null,
  ) {
    super(message);
    this.name = "NtnError";
  }
}

async function run(args: string[]): Promise<string> {
  try {
    const { stdout } = await exec(NTN_BIN, args, {
      maxBuffer: 32 * 1024 * 1024,
    });
    return stdout;
  } catch (err) {
    const e = err as NodeJS.ErrnoException & {
      stderr?: string;
      stdout?: string;
      code?: number | string;
    };
    if (e.code === "ENOENT") {
      throw new NtnError(
        "The `ntn` CLI is not installed. Install it with: curl -fsSL https://ntn.dev | bash",
        "",
        null,
      );
    }
    const stderr = e.stderr ?? "";
    const stdout = e.stdout ?? "";
    const detail = stderr.trim() || stdout.trim() || e.message;
    throw new NtnError(
      detail,
      stderr,
      typeof e.code === "number" ? e.code : null,
    );
  }
}

async function runJson<T>(args: string[]): Promise<T> {
  const stdout = await run([...args, "--json"]);
  return JSON.parse(stdout) as T;
}

export async function listWorkers(): Promise<Worker[]> {
  return runJson<Worker[]>(["workers", "list"]);
}

export async function getWorker(workerId: string): Promise<Worker> {
  return runJson<Worker>(["workers", "get", workerId]);
}

export async function listCapabilities(
  workerId: string,
): Promise<Capability[]> {
  return runJson<Capability[]>(["workers", "capabilities", "list", workerId]);
}

export type Webhook = {
  key: string;
  url: string;
  worker_id: string;
  worker_name: string;
  workspace_id: string;
};

export async function listWebhooks(workerId: string): Promise<Webhook[]> {
  return runJson<Webhook[]>(["workers", "webhooks", "list", workerId]);
}

export async function listRuns(workerId: string): Promise<Run[]> {
  return runJson<Run[]>(["workers", "runs", "list", workerId]);
}

export async function findRun(
  workerId: string,
  runId: string,
): Promise<Run | null> {
  const runs = await listRuns(workerId);
  return runs.find((r) => r.runId === runId) ?? null;
}

export async function getRunLogs(
  workerId: string,
  runId: string,
): Promise<LogResult> {
  return runJson<LogResult>([
    "workers",
    "runs",
    "logs",
    runId,
    "--worker-id",
    workerId,
  ]);
}

export async function listEnvVars(workerId: string): Promise<EnvVar[]> {
  return runJson<EnvVar[]>(["workers", "env", "list", workerId]);
}

export async function setEnvVar(
  workerId: string,
  key: string,
  value: string,
): Promise<void> {
  await run([
    "workers",
    "env",
    "set",
    `${key}=${value}`,
    "--worker-id",
    workerId,
  ]);
}

export async function unsetEnvVar(
  workerId: string,
  key: string,
): Promise<void> {
  await run(["workers", "env", "unset", key, "--worker-id", workerId]);
}

export async function pullEnv(workerId: string, file: string): Promise<void> {
  await run(["workers", "env", "pull", workerId, "--file", file, "--yes"]);
}

export async function pullEnvToString(workerId: string): Promise<string> {
  return run(["workers", "env", "pull", workerId, "--no-file", "--yes"]);
}

export async function executeCapability(
  workerId: string,
  key: string,
  input: string,
): Promise<string> {
  return run(["workers", "exec", key, "-d", input, "--worker-id", workerId]);
}

export type StreamHandle = {
  child: ChildProcessWithoutNullStreams;
  cancel: () => void;
};

type StreamCallbacks = {
  onChunk: (chunk: string, source: "stdout" | "stderr") => void;
  onClose: (exitCode: number | null) => void;
  onError: (err: Error) => void;
};

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

function attachStream(
  child: ChildProcessWithoutNullStreams,
  callbacks: StreamCallbacks,
): StreamHandle {
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) =>
    callbacks.onChunk(stripAnsi(chunk), "stdout"),
  );
  child.stderr.on("data", (chunk: string) =>
    callbacks.onChunk(stripAnsi(chunk), "stderr"),
  );
  child.on("error", callbacks.onError);
  child.on("close", (code) => callbacks.onClose(code));
  return {
    child,
    cancel: () => {
      if (!child.killed) child.kill("SIGTERM");
    },
  };
}

export function streamExecCapability(
  workerId: string,
  key: string,
  input: string,
  callbacks: StreamCallbacks,
): StreamHandle {
  const child = spawn(NTN_BIN, [
    "workers",
    "exec",
    key,
    "-d",
    input,
    "--worker-id",
    workerId,
    "--stream",
  ]);
  return attachStream(child, callbacks);
}

export function streamDeploy(
  workerLocation: string,
  callbacks: StreamCallbacks,
): StreamHandle {
  const child = spawn(NTN_BIN, ["workers", "deploy"], {
    cwd: workerLocation,
  });
  return attachStream(child, callbacks);
}

export async function startOAuth(
  workerId: string,
  key: string,
): Promise<unknown> {
  return runJson<unknown>([
    "workers",
    "oauth",
    "start",
    key,
    "--worker-id",
    workerId,
  ]);
}

export async function getOAuthToken(
  workerId: string,
  key: string,
): Promise<string> {
  const stdout = await run([
    "workers",
    "oauth",
    "token",
    key,
    "--worker-id",
    workerId,
    "--plain",
  ]);
  return stdout.trim();
}

export async function getSyncStatus(workerId: string): Promise<unknown[]> {
  return runJson<unknown[]>([
    "workers",
    "sync",
    "status",
    "--worker-id",
    workerId,
    "--no-watch",
  ]);
}

export { NtnError };
