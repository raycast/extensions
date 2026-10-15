import { spawn } from "node:child_process";
import {
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  statSync,
  renameSync,
} from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { type Configuration } from "./backend.ts";
import { manifestPath } from "./scope.ts";
import { existsSync } from "node:fs";

export type JobEvent = Record<string, unknown>;

export async function prepareLocalRanking(
  config: Configuration,
  onEvent: (event: JobEvent) => void,
  signal?: AbortSignal,
) {
  const folder = join(config.models, "reranker");
  let complete = false;
  await runJob(
    config,
    ["download-model", "--reranker", "--to", folder],
    (event) => {
      if (event.event === "done") complete = true;
      onEvent(event);
    },
    signal,
  );
  signal?.throwIfAborted();
  if (!complete) throw new Error("Model setup did not finish. Try again.");
  mkdirSync(folder, { recursive: true });
  const marker = join(folder, "enabled.json");
  writeFileSync(marker + ".tmp", JSON.stringify({ version: 1 }), {
    mode: 0o600,
  });
  renameSync(marker + ".tmp", marker);
}

export class IndexingInProgress extends Error {
  constructor() {
    super("An indexing job is already running.");
  }
}

export function runJob(
  config: Configuration,
  args: string[],
  onEvent: (event: JobEvent) => void,
  signal?: AbortSignal,
  onSpawn?: (pid: number) => void,
  maxRunMs?: number,
) {
  return new Promise<void>((resolve, reject) => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DIGUP_MODELS: config.models,
    };
    delete env.DIGUP_WORKER_DIR;
    const child = spawn(config.binary, args, { env, signal, stdio: "pipe" });
    child.stderr.resume();
    let failure: Error | undefined;
    let paused = false;
    let timer: NodeJS.Timeout | undefined;
    child.once("spawn", () => {
      try {
        if (child.pid) onSpawn?.(child.pid);
        if (maxRunMs !== undefined)
          timer = setTimeout(() => {
            paused = true;
            child.stdin.end("stop\n");
          }, maxRunMs);
      } catch (error) {
        failure = error instanceof Error ? error : new Error(String(error));
        child.kill();
      }
    });
    child.stdin.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code !== "EPIPE") {
        failure = error;
        child.kill();
      }
    });
    createInterface({ input: child.stdout }).on("line", (line) => {
      try {
        const event: unknown = JSON.parse(line);
        if (!event || typeof event !== "object" || Array.isArray(event))
          throw new Error("Invalid indexing response.");
        const data = event as JobEvent;
        if (data.event === "error")
          failure = new Error(
            typeof data.message === "string"
              ? data.message
              : "Indexing failed.",
          );
        onEvent(data);
      } catch (error) {
        failure =
          error instanceof Error
            ? error
            : new Error("Invalid indexing response.");
        child.kill();
      }
    });
    child.on("error", (error) => {
      failure = error;
    });
    child.on("close", (code, killedBy) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else if (code === 0) {
        try {
          if (paused) onEvent({ event: "paused" });
          resolve();
        } catch (error) {
          reject(error);
        }
      } else
        reject(
          new Error(
            killedBy
              ? "Indexing stopped."
              : `Lens’s engine exited with code ${code}.`,
          ),
        );
    });
  });
}

export async function indexFolders(
  config: Configuration,
  onEvent: (event: JobEvent) => void,
  signal?: AbortSignal,
) {
  if (!config.roots.length && !config.codeRoots.length)
    throw new Error("Choose search folders first.");
  mkdirSync(config.index, { recursive: true });
  const lock = join(config.index, "indexing.lock");
  try {
    const pid = Number(readFileSync(lock, "utf8"));
    if (
      (!Number.isSafeInteger(pid) || pid <= 0) &&
      Date.now() - statSync(lock).mtimeMs < 60_000
    )
      throw new IndexingInProgress();
    if (Number.isSafeInteger(pid) && pid > 0) {
      try {
        process.kill(pid, 0);
        throw new IndexingInProgress();
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !("code" in error) ||
          error.code !== "ESRCH"
        )
          throw error;
      }
    }
    unlinkSync(lock);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    )
      throw error;
  }
  let fd: number;
  try {
    fd = openSync(lock, "wx");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST")
      throw new IndexingInProgress();
    throw error;
  }
  try {
    try {
      writeFileSync(fd, String(process.pid));
    } finally {
      closeSync(fd);
    }
    const recordOwner = (pid: number) => writeFileSync(lock, String(pid));
    await runJob(
      config,
      ["download-model", "--to", config.models],
      onEvent,
      signal,
      recordOwner,
    );
    const args = [
      "index-service",
      ...config.roots,
      "--index",
      config.index,
      "--backfill",
      "--prune",
      "--linger",
      "0",
    ];
    for (const root of config.codeRoots) args.push("--code-root", root);
    for (const root of config.excluded) args.push("--exclude", root);
    for (const root of config.codeExcluded) args.push("--code-exclude", root);
    for (const type of config.types) args.push("--exclude-ext", type);
    if (existsSync(manifestPath(config)))
      args.push("--exclude-files", manifestPath(config));
    const scopeConfig = JSON.stringify([
      config.roots,
      config.codeRoots,
      config.excluded,
      config.codeExcluded,
      config.types,
    ]);
    const scopeStamp = join(config.index, "scope-configuration.json");
    let changed =
      !existsSync(manifestPath(config)) ||
      Date.now() - statSync(manifestPath(config)).mtimeMs > 86_400_000 ||
      !existsSync(scopeStamp) ||
      readFileSync(scopeStamp, "utf8") !== scopeConfig;
    await runJob(
      config,
      args
        .filter((arg) => arg !== "--backfill")
        .concat(["--new-limit", "0", "--incremental"]),
      (event) => {
        if (event.event === "sync")
          changed ||= [
            event.added,
            event.changed,
            event.moved,
            event.removed,
          ].some((v) => typeof v === "number" && v > 0);
        if (["pruned", "reindex", "rescan"].includes(String(event.event)))
          changed = true;
        if (event.event !== "summary") onEvent(event);
      },
      signal,
      recordOwner,
    );
    // Catalogs stay native: Raycast background commands have only a 100 MB JavaScript heap.
    if (changed) {
      await runJob(
        config,
        ["scope-service", ...args.slice(1)],
        onEvent,
        signal,
        recordOwner,
      );
      writeFileSync(scopeStamp, scopeConfig, { mode: 0o600 });
    }
    if (!args.includes("--exclude-files"))
      args.push("--exclude-files", manifestPath(config));
    // The native stop command saves the current file/batch before releasing the model; the next tick resumes.
    await runJob(
      config,
      args.concat([changed ? "--incremental" : "--skip-sync", "--power-aware"]),
      onEvent,
      signal,
      recordOwner,
      60_000,
    );
  } finally {
    unlinkSync(lock);
  }
}
