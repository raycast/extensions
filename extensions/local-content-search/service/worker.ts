import {
  spawn,
  execFile,
  ChildProcessWithoutNullStreams,
} from "node:child_process";
import { promisify } from "node:util";
import { createInterface } from "node:readline";
import { StringDecoder } from "node:string_decoder";
import { MIN_MEMORY_MB } from "./protocol";

// One bounded subprocess owns native extraction/inference; it cannot exhaust Node's output buffer.
const exec = promisify(execFile);
const OUTPUT_BYTES = 4 * 1024 * 1024;
const RESOURCE_POLL_MS = 2000;
const KILL_GRACE_MS = 3000;
const LOW_PRIORITY = "10";
export const SEARCH_TIMEOUT_MS = 30000;
export const INDEX_TIMEOUT_MS = 30 * 60 * 1000;

export enum WorkerKind {
  Index = "index",
  Query = "query",
}

export interface WorkerOptions {
  kind?: WorkerKind;
  models: string;
  scratch?: string;
  memoryLimitMb: number;
  timeoutMs: number;
  signal?: AbortSignal;
  onLine?: (line: string) => void;
}

export interface WorkerRun {
  done: Promise<string>;
  stop: () => void;
  pid: number | undefined;
}

// Separate policy construction so tests can enforce interactive queries and bounded indexing.
export function workerPolicy(
  binary: string,
  args: string[],
  options: WorkerOptions,
) {
  const memory = ["-m", String(Math.max(MIN_MEMORY_MB, options.memoryLimitMb))];
  if (options.kind === WorkerKind.Index) {
    return {
      command: "/usr/sbin/taskpolicy",
      args: [
        ...memory,
        "-c",
        "utility",
        "/usr/bin/nice",
        "-n",
        LOW_PRIORITY,
        binary,
        ...args,
      ],
    };
  }
  return {
    command: "/usr/sbin/taskpolicy",
    args: [...memory, binary, ...args],
  };
}

export function startWorker(
  binary: string,
  args: string[],
  options: WorkerOptions,
): WorkerRun {
  // Pass a minimal environment: inherited Python/remote-runtime flags cannot select another model.
  const policy = workerPolicy(binary, args, options);
  const child: ChildProcessWithoutNullStreams = spawn(
    policy.command,
    policy.args,
    {
      env: {
        PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
        HOME: process.env.HOME,
        TMPDIR: options.scratch ?? process.env.TMPDIR,
        DIGUP_MODELS: options.models,
        LOCAL_SEARCH_THREADS: "4",
      },
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  // Stream decoders retain incomplete UTF-8 characters until the next byte chunk arrives.
  const outputDecoder = new StringDecoder();
  const errorDecoder = new StringDecoder();
  let output = "",
    stderr = "",
    bytes = 0,
    failure: Error | undefined;
  let killed: NodeJS.Timeout | undefined;
  let finished = false;

  // Terminate promptly so searches can take the slot; SQLite WAL recovers interrupted writes.
  // Escalate only when a reader/model does not exit after SIGTERM.
  const stop = () => {
    if (finished || killed) {
      return;
    }
    child.stdin.write("stop\n", () => {});
    child.stdin.end();
    child.kill("SIGTERM");
    killed = setTimeout(() => {
      child.kill("SIGKILL");
    }, KILL_GRACE_MS);
    killed.unref();
  };
  const fail = (message: string) => {
    failure ??= new Error(message);
    stop();
  };
  const abort = () => {
    fail("Search cancelled");
  };
  const timeout = setTimeout(() => {
    fail("Native worker exceeded its time budget; work remains queued");
  }, options.timeoutMs);
  const monitor = setInterval(() => {
    if (!child.pid || finished) {
      return;
    }
    void exec("/bin/ps", ["-o", "rss=", "-p", String(child.pid)], {
      timeout: RESOURCE_POLL_MS,
    })
      .then(({ stdout }) => {
        if (Number(stdout.trim()) > options.memoryLimitMb * 1024) {
          fail(
            "Native worker exceeded its memory budget; indexing was stopped",
          );
        }
      })
      .catch(() => {});
  }, RESOURCE_POLL_MS);
  timeout.unref();
  monitor.unref();
  child.stdin.on("error", () => {});
  child.stdout.on("data", (chunk: Buffer) => {
    bytes += chunk.length;
    if (bytes > OUTPUT_BYTES && !options.onLine) {
      fail("Native worker produced too much output");
      return;
    }
    if (!options.onLine) {
      output += outputDecoder.write(chunk);
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    stderr = (stderr + errorDecoder.write(chunk)).slice(-8192);
  });
  const lines = options.onLine
    ? createInterface({ input: child.stdout })
    : undefined;
  lines?.on("line", (line) => {
    if (line.length > 64 * 1024) {
      fail("Native event exceeded its size budget");
      return;
    }
    options.onLine?.(line);
  });
  const done = new Promise<string>((resolve, reject) => {
    child.on("error", (error) => {
      failure = error;
    });
    child.on("close", (code, signal) => {
      finished = true;
      output += outputDecoder.end();
      stderr = (stderr + errorDecoder.end()).slice(-8192);
      clearTimeout(timeout);
      clearInterval(monitor);
      if (killed) {
        clearTimeout(killed);
      }
      lines?.close();
      options.signal?.removeEventListener("abort", abort);
      if (failure || code !== 0) {
        reject(
          failure ??
            new Error(
              stderr.trim() || `Native worker stopped (${signal ?? code})`,
            ),
        );
        return;
      }
      resolve(output);
    });
  });
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) {
    abort();
  }
  return { done, stop, pid: child.pid };
}
