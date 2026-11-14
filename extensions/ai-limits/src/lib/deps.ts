/// <reference types="node" />
import { execFile } from "node:child_process";
import { access, constants, readdir, readFile } from "node:fs/promises";
import os from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Raycast runs with a minimal PATH, so the system binary is referenced by absolute path.
const SQLITE3 = "/usr/bin/sqlite3";

// Everything a provider touches outside its own code. Commands use realDeps(); tests pass fakes, so no test reads real
// files, runs a real binary or makes a network request.
export interface Deps {
  fetch: typeof fetch;
  // The file's text, or null when it doesn't exist. Other read errors throw.
  readFile(path: string): Promise<string | null>;
  // The names of the entries in a directory, or null when it doesn't exist. Other read errors throw.
  listDir(path: string): Promise<string[] | null>;
  // Runs a read-only query with /usr/bin/sqlite3 and returns its stdout. Throws when the database can't be opened.
  sqlite(dbPath: string, sql: string): Promise<string>;
  // Runs a program (absolute path, no shell) and resolves with its exit code and output. A non-zero exit resolves too;
  // only a program that can't be started, or one that runs past `timeoutMs`, rejects. The program is killed with
  // SIGKILL at the timeout, since an interactive shell ignores SIGTERM. Its stdin is closed at once, so a program that
  // waits for input (such as a shell rc file that asks a question) ends instead of hanging.
  run(file: string, args: string[], options?: RunOptions): Promise<RunResult>;
  // Whether the path is a file this process may execute.
  isExecutable(path: string): Promise<boolean>;
  platform: NodeJS.Platform;
  homedir: string;
  env: Record<string, string | undefined>;
  now(): number;
}

export interface RunOptions {
  // Defaults to 10 seconds. A command that waits for the user, such as osascript's first Automation prompt, passes a
  // longer one.
  timeoutMs?: number;
  // Replaces the environment of the child. Defaults to this process's environment.
  env?: Record<string, string | undefined>;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export function realDeps(): Deps {
  return {
    fetch: (input, init) => fetch(input, init),
    readFile: async (path) => {
      try {
        return await readFile(path, "utf8");
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return null;
        }
        throw error;
      }
    },
    listDir: async (path) => {
      try {
        return await readdir(path);
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "ENOENT" || code === "ENOTDIR") {
          return null;
        }
        throw error;
      }
    },
    sqlite: async (dbPath, sql) => {
      const { stdout } = await execFileAsync(SQLITE3, ["-readonly", dbPath, sql], { timeout: 10_000 });
      return stdout;
    },
    run: (file, args, options) =>
      new Promise((resolve, reject) => {
        const child = execFile(
          file,
          args,
          {
            timeout: options?.timeoutMs ?? 10_000,
            env: options?.env ?? process.env,
            maxBuffer: 1024 * 1024,
            killSignal: "SIGKILL",
          },
          (error, stdout, stderr) => {
            if (error && (typeof error.code !== "number" || error.killed)) {
              reject(error);
              return;
            }
            resolve({ exitCode: typeof error?.code === "number" ? error.code : 0, stdout, stderr });
          },
        );
        child.stdin?.end();
      }),
    isExecutable: async (path) => {
      try {
        await access(path, constants.X_OK);
        return true;
      } catch {
        return false;
      }
    },
    platform: process.platform,
    homedir: os.homedir(),
    env: process.env,
    now: () => Date.now(),
  };
}
