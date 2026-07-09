// src/lib/tasktick.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExecutionLog, Task } from "./types";

const execFileAsync = promisify(execFile);

export class CliError extends Error {
  constructor(
    public readonly stderr: string,
    public readonly exitCode: number,
  ) {
    super(stderr.split("\n")[0] || `tasktick exited with code ${exitCode}`);
  }
}

interface ExecError {
  code?: number | string;
  stderr?: string;
}

function isExecError(err: unknown): err is ExecError {
  return (
    typeof err === "object" &&
    err !== null &&
    ("code" in err || "stderr" in err)
  );
}

async function runJSON<T>(cliPath: string, args: string[]): Promise<T> {
  try {
    const { stdout } = await execFileAsync(cliPath, [...args, "--json"], {
      maxBuffer: 16 * 1024 * 1024,
    });
    return JSON.parse(stdout) as T;
  } catch (err) {
    if (
      isExecError(err) &&
      (typeof err.code === "number" || typeof err.code === "string")
    ) {
      throw new CliError(err.stderr ?? String(err), Number(err.code) || 1);
    }
    throw err;
  }
}

async function runVoid(cliPath: string, args: string[]): Promise<void> {
  try {
    await execFileAsync(cliPath, args);
  } catch (err) {
    if (isExecError(err)) {
      throw new CliError(err.stderr ?? String(err), Number(err.code) || 1);
    }
    throw err;
  }
}

export const tasktick = {
  list: (cliPath: string) => runJSON<Task[]>(cliPath, ["list"]),
  status: (cliPath: string, id?: string) =>
    runJSON<unknown>(cliPath, id ? ["status", id] : ["status"]),
  logs: (cliPath: string, id: string) =>
    runJSON<ExecutionLog>(cliPath, ["logs", id]),
  run: (cliPath: string, id: string) => runVoid(cliPath, ["run", id]),
  stop: (cliPath: string, id: string) => runVoid(cliPath, ["stop", id]),
  restart: (cliPath: string, id: string) => runVoid(cliPath, ["restart", id]),
  reveal: (cliPath: string, id: string) => runVoid(cliPath, ["reveal", id]),
};
