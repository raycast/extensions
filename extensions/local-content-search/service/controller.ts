import {
  access,
  readFile,
  realpath,
  readdir,
  writeFile,
  rename,
  mkdir,
  stat,
} from "node:fs/promises";
import { watch, FSWatcher } from "node:fs";
import { join } from "node:path";
import { Paths } from "./paths";
import { selectedPath } from "./selection";
import { readResourceBlock, ResourceBlock } from "./resources";
import {
  Config,
  DEFAULT_CONFIG,
  Hit,
  Status,
  PROTOCOL_VERSION,
  validateConfig,
  decodeHits,
} from "./protocol";
import {
  startWorker,
  WorkerRun,
  WorkerKind,
  SEARCH_TIMEOUT_MS,
  INDEX_TIMEOUT_MS,
} from "./worker";

// Indexing and query inference share one native-worker slot:
// watchers -> dirty flag -> index worker <-- yields to <-- search request.
const RECONCILE_MS = 60000;
const POWER_POLL_MS = 10000;
const DEBOUNCE_MS = 2000;
const QUERY_IDLE_MS = 10000;
const CACHE_LIMIT = 64;
const PRUNE_TIMEOUT_MS = 30000;
// A two-standard-deviation gate hides valid semantic matches in tiny indexes (including a single document).
const MIN_SEMANTIC_Z = "0";
const TEXT_MODEL = "embeddinggemma-2-Q8_0.gguf";
const MEDIA_MODEL = "mmproj-embeddinggemma-2-Q8_0.gguf";

export class Controller {
  private config: Config = structuredClone(DEFAULT_CONFIG);
  private activity = "idle";
  private progress: Status["progress"];
  private counts: Status["counts"];
  private missingRoots: string[] = [];
  private error: string | undefined;
  private worker: WorkerRun | undefined;
  private watchers: FSWatcher[] = [];
  private reconcile: NodeJS.Timeout | undefined;
  private powerTimer: NodeJS.Timeout | undefined;
  private scheduled: NodeJS.Timeout | undefined;
  private dirty = true;
  private querying = false;
  private closed = false;
  private blocked: string | undefined;
  private cache = new Map<string, Hit[]>();
  private configQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly locations: Paths) {}

  async initialize(): Promise<void> {
    await mkdir(this.locations.index, { recursive: true, mode: 0o700 });
    // Keep native temporary-file cleanup inside our own state, never another app's system temp folders.
    await mkdir(this.locations.scratch, { recursive: true, mode: 0o700 });
    try {
      this.config = validateConfig(
        JSON.parse(await readFile(this.locations.config, "utf8")),
      );
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        this.config.paused = true;
        this.error = `Configuration could not be read; indexing paused: ${String(error)}`;
      }
    }
    await this.refreshPower();
    this.resetWatchers();
    this.reconcile = setInterval(() => {
      this.markDirty();
    }, RECONCILE_MS);
    this.powerTimer = setInterval(() => {
      void this.refreshPower();
    }, POWER_POLL_MS);
    this.schedule();
  }

  async status(): Promise<Status> {
    return {
      version: PROTOCOL_VERSION,
      config: structuredClone(this.config),
      activity: this.config.paused ? "paused" : (this.blocked ?? this.activity),
      progress: this.progress,
      counts: this.counts,
      missingRoots: [...this.missingRoots],
      error: this.error,
      modelReady: await this.modelsReady(),
    };
  }

  async configure(value: unknown): Promise<void> {
    // Serialize writes so competing UI actions cannot leave a partial or stale config file.
    const next = validateConfig(value);
    const update = this.configQueue.then(async () => {
      if (this.closed) {
        throw new Error("Service is stopping");
      }
      const roots: string[] = [];
      for (const root of next.roots) {
        try {
          const resolved = await realpath(root);
          await readdir(resolved);
          roots.push(resolved);
        } catch (error) {
          // Existing disconnected/unreadable roots stay selected; control changes must still work.
          if (!this.config.roots.includes(root)) {
            throw error;
          }
          roots.push(root);
        }
      }
      next.roots = validateConfig({ ...next, roots }).roots;
      next.excludedFolders = await Promise.all(
        next.excludedFolders.map((folder) =>
          realpath(folder).catch(() => folder),
        ),
      );
      await writeFile(
        `${this.locations.config}.tmp`,
        JSON.stringify(next, null, 2),
        { mode: 0o600 },
      );
      await rename(`${this.locations.config}.tmp`, this.locations.config);
      this.config = next;
      await this.stopWorker();
      // Removing the last folder is an explicit index cleanup, not background inference; honor it even while paused.
      if (next.roots.length === 0) {
        await this.clearIndex();
      }
      this.resetWatchers();
      this.cache.clear();
      this.markDirty();
      await this.refreshPower();
    });
    this.configQueue = update.catch(() => {});
    return update;
  }

  async search(query: string, signal: AbortSignal): Promise<Hit[]> {
    if (this.querying) {
      throw new Error("A search is already running; try again shortly");
    }
    // Reserve the query slot before asynchronous readiness checks; concurrent requests must not kill each other.
    this.querying = true;
    let queryWorker: WorkerRun | undefined;
    try {
      if (this.blocked === ResourceBlock.Memory) {
        throw new Error(
          "Search paused because macOS reports high memory pressure; close another app and retry",
        );
      }
      if (!(await this.modelsReady())) {
        throw new Error(
          "EmbeddingGemma 2 is not installed. Run npm run download:models in the repository",
        );
      }
      if (this.config.roots.length === 0) {
        throw new Error("Choose a folder in Manage Content Index first");
      }
      const cached = this.cache.get(query);
      if (cached) {
        return cached;
      }
      await this.stopWorker();
      if (signal.aborted) {
        throw new Error("Search cancelled");
      }
      this.activity = "searching";
      // A leading space makes even '--reindex' a positional value in the inherited parser.
      this.worker = startWorker(
        this.locations.engine,
        [
          "search",
          ` ${query}`,
          "--index",
          this.locations.index,
          "--json",
          "-n",
          "50",
          "--zgate",
          MIN_SEMANTIC_Z,
          ...this.config.roots.flatMap((root) => ["--root", root]),
          ...this.config.excludedFolders.flatMap((folder) => [
            "--exclude",
            folder,
          ]),
          ...this.config.excludedExtensions.flatMap((extension) => [
            "--exclude-ext",
            extension,
          ]),
        ],
        {
          models: this.locations.models,
          scratch: this.locations.scratch,
          memoryLimitMb: this.config.memoryLimitMb,
          timeoutMs: SEARCH_TIMEOUT_MS,
          signal,
        },
      );
      queryWorker = this.worker;
      const rows = decodeHits(await queryWorker.done);
      // Removed or excluded folders must stop appearing immediately, before the next prune pass.
      const hits = rows.filter((hit) => selectedPath(this.config, hit.path));
      if (this.cache.size >= CACHE_LIMIT) {
        this.cache.delete(this.cache.keys().next().value!);
      }
      this.cache.set(query, hits);
      return hits;
    } finally {
      if (queryWorker && this.worker === queryWorker) {
        this.worker = undefined;
        this.activity = "idle";
      }
      this.querying = false;
      this.schedule(QUERY_IDLE_MS);
    }
  }

  markDirty(): void {
    this.dirty = true;
    this.cache.clear();
    this.schedule();
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.reconcile) {
      clearInterval(this.reconcile);
    }
    if (this.powerTimer) {
      clearInterval(this.powerTimer);
    }
    if (this.scheduled) {
      clearTimeout(this.scheduled);
    }
    for (const watcher of this.watchers) {
      watcher.close();
    }
    await this.stopWorker();
  }

  private async modelsReady(): Promise<boolean> {
    try {
      const [text, media] = await Promise.all([
        stat(join(this.locations.models, TEXT_MODEL)),
        stat(join(this.locations.models, MEDIA_MODEL)),
      ]);
      return text.size === 309855456 && media.size === 554821024;
    } catch {
      return false;
    }
  }

  private schedule(delay = DEBOUNCE_MS): void {
    if (this.closed) {
      return;
    }
    if (this.scheduled) {
      clearTimeout(this.scheduled);
    }
    this.scheduled = setTimeout(() => {
      void this.index().catch((error) => {
        this.error = String(error);
        this.activity = "error";
      });
    }, delay);
  }

  private resetWatchers(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    for (const root of this.config.roots) {
      try {
        const watcher = watch(root, { recursive: true }, () => {
          this.markDirty();
        });
        watcher.on("error", (error) => {
          this.error = `Folder watcher: ${error.message}; periodic rescans remain enabled`;
        });
        this.watchers.push(watcher);
      } catch {
        /* Disconnected drives are retried during periodic reconciliation. */
      }
    }
  }

  private async clearIndex(): Promise<void> {
    const worker = startWorker(
      this.locations.engine,
      [
        "index-service",
        "--index",
        this.locations.index,
        "--prune",
        "--linger",
        "0",
        "--new-limit",
        "0",
      ],
      {
        kind: WorkerKind.Index,
        models: this.locations.models,
        scratch: this.locations.scratch,
        memoryLimitMb: this.config.memoryLimitMb,
        timeoutMs: PRUNE_TIMEOUT_MS,
        onLine: (line) => {
          this.onEvent(line);
        },
      },
    );
    this.worker = worker;
    try {
      await worker.done;
      this.progress = undefined;
      this.missingRoots = [];
      this.error = undefined;
      this.activity = "idle";
    } finally {
      if (this.worker === worker) {
        this.worker = undefined;
      }
    }
  }

  private async stopWorker(): Promise<void> {
    const worker = this.worker;
    if (!worker) {
      return;
    }
    worker.stop();
    await worker.done.catch(() => {});
    if (this.worker === worker) {
      this.worker = undefined;
    }
    this.dirty = true;
  }

  private async refreshPower(): Promise<void> {
    if (process.platform !== "darwin") {
      return;
    }
    try {
      this.blocked = await readResourceBlock(
        this.locations.engine,
        this.config.powerMode,
      );
      if (
        this.blocked &&
        (!this.querying || this.blocked === ResourceBlock.Memory)
      ) {
        await this.stopWorker();
      }
      if (!this.blocked) {
        this.schedule();
      }
    } catch {
      this.blocked = ResourceBlock.Unavailable;
    }
  }

  private async index(): Promise<void> {
    if (
      this.closed ||
      this.querying ||
      this.worker ||
      !this.dirty ||
      this.config.paused ||
      this.blocked ||
      this.config.roots.length === 0
    ) {
      return;
    }
    if (!(await this.modelsReady())) {
      this.activity = "waiting: model download";
      return;
    }
    await access(this.locations.engine);
    // A search, pause, or config change may arrive while the filesystem checks above are awaiting.
    if (
      this.closed ||
      this.querying ||
      this.worker ||
      this.config.paused ||
      this.blocked ||
      this.config.roots.length === 0
    ) {
      return;
    }
    this.dirty = false;
    this.error = undefined;
    this.activity = "indexing";
    this.progress = undefined;
    const args = [
      "index-service",
      ...this.config.roots,
      "--index",
      this.locations.index,
      "--backfill",
      "--prune",
      "--linger",
      "0",
      "--new-limit",
      "0",
    ];
    for (const folder of this.config.excludedFolders) {
      args.push("--exclude", folder);
    }
    if (this.config.excludedExtensions.length) {
      args.push("--exclude-ext", this.config.excludedExtensions.join(","));
    }
    this.missingRoots = [];
    const worker = startWorker(this.locations.engine, args, {
      kind: WorkerKind.Index,
      models: this.locations.models,
      scratch: this.locations.scratch,
      memoryLimitMb: this.config.memoryLimitMb,
      timeoutMs: INDEX_TIMEOUT_MS,
      onLine: (line) => {
        this.onEvent(line);
      },
    });
    this.worker = worker;
    try {
      await worker.done;
    } catch (error) {
      if (!this.querying && !this.config.paused && !this.closed) {
        this.error = String(error);
      }
    } finally {
      if (this.worker === worker) {
        this.worker = undefined;
        this.activity = this.error ? "error" : "idle";
      }
      this.cache.clear();
      if (this.dirty) {
        this.schedule();
      }
    }
  }

  private onEvent(line: string): void {
    try {
      const event = JSON.parse(line);
      if (event.event === "file") {
        this.progress = {
          done: event.done,
          total: event.total,
          path: event.path,
        };
      }
      if (event.files !== undefined) {
        this.counts = {
          files: event.files,
          searchable: event.searchable,
          pending: event.pending,
          vectors: event.vectors,
        };
      }
      if (event.event === "missing") {
        this.missingRoots = [
          ...(event.folders ?? []),
          ...(event.unreadable ?? []),
        ];
      }
      if (event.event === "error") {
        this.error = String(event.message);
      }
    } catch {
      this.error = "Invalid event from native worker";
    }
  }
}
