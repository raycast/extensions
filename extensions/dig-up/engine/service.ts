// The daemon's brain (DigUp: IndexService.serve, the app's Engine, and digup's search orchestration). The daemon is only
// its shell: it serves engine/api.ts, keeps the settings file, watches the folders and the power policy, and hands all
// of that to a Service.
//
// Indexing runs as passes, one at a time. A pass syncs first, then reads in DigUp's order of priority: the files the
// sync just found (up to 50, on any power source), the first full pass (held by battery, Low Power Mode, heat), the
// code index once the main one has nothing waiting, and the rest of long files last. Between jobs it yields to a stop,
// a pause, a change of folders, and to a sync asked for once indexing has had as long as the last sync took.

import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  API_VERSION,
  type Config,
  type EstimateRequest,
  type FileListItem,
  type FileListRequest,
  type FolderEstimate,
  type IndexCounts,
  type KindCounts,
  type OpenMediaRequest,
  type OpenPdfRequest,
  type OpenResponse,
  type SearchRequest,
  type SearchResponse,
  type SetupState,
  type Status,
  type ThumbRequest,
  type ThumbResponse,
} from "./api";
import { EmbedderManager, type Embedder, type EmbedderState } from "./embedder";
import { MeasuredCosts } from "./estimator";
import { Helper, mtmdBeside } from "./helper";
import { Indexer } from "./indexer";
import {
  TEXT_MODEL,
  findLlama,
  findModels,
  installLlama,
  installModels,
  type InstallProgress,
  type LlamaLookup,
  type ModelLookup,
} from "./install";
import type { Log } from "./log";
import type { Paths } from "./paths";
import { FolderSelection, lastPathComponent, pathExtension } from "./rules";
import { Searcher } from "./searcher";
import { lowercased } from "./searchtext";
import { access, estimateFolder, folderSummaries, isFolder, isReadable, suggestCodeFolders } from "./service-folders";
import { ThumbCache } from "./service-thumbs";
import { Store, type FileRecord } from "./store";
import {
  DEFAULT_OPTIONS,
  Prompts,
  VECTOR_SOURCE,
  codeQueryText,
  strongCount,
  type FileKind,
  type IndexOptions,
} from "./types";

/** The helper ops the service uses: one helper reads files for indexing, another serves the UI (estimates, previews,
 *  opening files), so neither waits behind the other. */
export type ServiceHelper = Pick<
  Helper,
  | "walk"
  | "image"
  | "pdf"
  | "rich"
  | "audio"
  | "video"
  | "thumb"
  | "pages"
  | "durations"
  | "openPdf"
  | "openMedia"
  | "close"
>;

/** The embedders (EmbedderManager): a text-only server for queries and a full one for indexing. */
export interface Embedders {
  query(): Promise<Embedder>;
  index(): Promise<Embedder>;
  doneIndexing(): void;
  state(): EmbedderState;
  stop(): Promise<void>;
  /** Stops the index server now (a job cut short); the next index() starts it again. */
  stopIndexing?(): Promise<void>;
}

/** What the service is made of; tests swap in fakes. */
export interface ServiceDeps {
  makeHelper: (role: "index" | "ui", mtmdLibrary: string | null) => ServiceHelper;
  makeEmbedders: (files: { server: string; text: string; media: string | null }) => Embedders;
  findLlama: (paths: Paths, override: string | null) => LlamaLookup;
  findModels: (paths: Paths, override: string | null) => ModelLookup;
  installLlama: typeof installLlama;
  installModels: typeof installModels;
  home: string;
  /** The git that lists what a repo keeps; undefined finds one. */
  git?: string | null;
  /** New files indexed at once, on any power source (DigUp: --new-limit, 50). */
  newFilesLimit: number;
  /** A requested sync waits at least this long behind running indexing (DigUp: 2 s, or the last sync's length). */
  minYieldMs: number;
  /** The vectors held for search go when the query encoder has been idle this long (DigUp: 600 s). */
  encoderIdleSeconds: number;
  /** Ports llama-server may listen on. */
  portRange?: [number, number];
  /** A failed pass (or index open) is tried again after this, doubling up to `retryMaxMs`. */
  retryBaseMs: number;
  retryMaxMs: number;
  /** A pass asked to end gets this long to finish its job before what it waits on is ended (DigUp: 15 s). */
  stopCutMs: number;
}

export interface ServiceOptions {
  paths: Paths;
  config: Config;
  log: Log;
  deps?: Partial<ServiceDeps>;
}

/** One index (main or code): its file, search over it, and what the last sync saw of its folders. */
interface Part {
  code: boolean;
  store: Store;
  searcher: Searcher;
  indexer: Indexer | null;
  missing: string[];
  unreadable: string[];
  counts: IndexCounts | null;
  /** When `counts` were made, and whether indexing has changed them since. */
  countsAt: number;
  countsStale: boolean;
  /** How long the last count took: counting a big index is held to a small share of the time. */
  countsMs: number;
  lastRefresh: number;
  /** How long the last reload of the vectors took (they're read again at most every 10 times that). */
  refreshMs: number;
  /** Indexing wrote vectors since the searcher last read them (they're appended). */
  changed: boolean;
  /** A sync or a prune removed rows since: the searcher has to read them all again. */
  removed: boolean;
}

const POWER_HOLDS: ReadonlySet<NonNullable<Status["held"]>> = new Set(["on battery", "Low Power Mode", "Mac is warm"]);
const VECTOR_CACHE = 256;
const SCRATCH_PREFIX = "DigUpRaycast-";

const sameList = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

function emptyKindCounts(): KindCounts {
  return { files: 0, done: 0, partial: 0, pending: 0, skipped: 0, failed: 0 };
}

/** Store counts as the API reports them. */
export function indexCounts(store: Store): IndexCounts {
  const counts = store.counts();
  const byKind: Partial<Record<FileKind, KindCounts>> = {};
  const total = emptyKindCounts();
  for (const [kind, states] of Object.entries(counts.byKindAndState)) {
    const row = (byKind[kind as FileKind] = emptyKindCounts());
    for (const [state, n] of Object.entries(states)) {
      row.files += n;
      total.files += n;
      if (state in row && state !== "files") {
        row[state as keyof KindCounts] += n;
        total[state as keyof KindCounts] += n;
      }
    }
  }
  return {
    byKind,
    total,
    vectors: counts.vectors,
    segments: counts.segments,
    unfinished: { files: counts.unfinished, units: counts.left },
  };
}

/** Scratch folders of Dig Up processes that are gone (killed mid-job). */
function removeStaleScratch(log: Log): void {
  const temp = tmpdir();
  let names: string[] = [];
  try {
    names = readdirSync(temp);
  } catch {
    return;
  }
  for (const name of names) {
    if (!name.startsWith(SCRATCH_PREFIX)) continue;
    const pid = Number(name.slice(SCRATCH_PREFIX.length));
    if (!Number.isInteger(pid) || pid === process.pid) continue;
    try {
      process.kill(pid, 0);
      continue; // still running
    } catch (error) {
      if ((error as { code?: string }).code !== "ESRCH") continue;
    }
    rmSync(join(temp, name), { recursive: true, force: true });
    log.info(`engine: removed the scratch folder of a gone process (${name})`);
  }
}

export class Service {
  private readonly paths: Paths;
  private config: Config;
  private readonly log: Log;
  private readonly deps: ServiceDeps;
  private readonly startedAt = Date.now();

  private main: Part | null = null;
  private code: Part | null = null;
  private indexHelper: ServiceHelper | null = null;
  private indexHelperMtmd: string | null = null;
  private uiHelper: ServiceHelper | null = null;
  private embedders: Embedders | null = null;
  private embedderFiles = "";
  private readonly thumbs: ThumbCache;

  // Setup
  private setupState: SetupState = { state: "missing", missing: ["model-text", "model-media", "llama"] };
  private llama: string | null = null;
  private models: { text: string; media: string | null } | null = null;
  private installing: Promise<void> | null = null;
  private installAbort: AbortController | null = null;
  private rate: { at: number; bytes: number; perSecond: number | null } | null = null;

  // Indexing passes
  private serving: Promise<void> | null = null;
  private syncRequested = false;
  private codeSyncRequested = false;
  /** A pass ends after its current job: a pause, a stop. */
  private stopRequested = false;
  /** The folders changed: the pass ends after its job and a new one starts with them. */
  private restartRequested = false;
  private pruneWanted: boolean;
  private deleteCodeIndex = false;
  /** Rebuilds hold new passes until the previous pass has ended and all resets finish. */
  private rebuilding = 0;
  private yieldAt = 0;
  private stopped = false;
  private started = false;
  /** A failed pass or index open is tried again later, never at once: a cause that stays (a full disk, a locked or
   *  broken index) would otherwise start pass after pass. */
  private retryTimer: NodeJS.Timeout | null = null;
  private retryDelay = 0;
  /** The 15 s cut of a job that doesn't end when asked, and the job it was armed on. */
  private cutTimer: NodeJS.Timeout | null = null;
  private jobSerial = 0;

  // Holds and status
  private policyHeld: Status["held"] = null;
  private heldUntil: number | null = null;
  private activity: Status["activity"] = { state: "starting" };
  private lastError: Status["lastError"] = null;
  private watchMissing = new Set<string>();
  private watchUnreadable = new Set<string>();
  private summaries: { main: Status["folderSummaries"]; code: Status["codeFolderSummaries"]; at: number } | null = null;
  private summariesMs = 0;

  // Search
  private readonly vectorCache = new Map<string, Float32Array>();
  private newestTyped: string | null = null;
  private lastQueryAt = 0;
  private warnedAboutSource = false;
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(o: ServiceOptions) {
    this.paths = o.paths;
    this.config = o.config;
    this.log = o.log;
    const log = o.log;
    this.deps = {
      makeHelper: (_role, mtmdLibrary) => new Helper(o.paths.helperBin, log, { mtmdLibrary }),
      makeEmbedders: (files) =>
        new EmbedderManager({
          serverBin: files.server,
          textModel: files.text,
          mediaModel: files.media ?? "",
          logs: o.paths.logs,
          log,
          portRange: this.deps.portRange,
        }),
      findLlama,
      findModels,
      installLlama,
      installModels,
      home: homedir(),
      newFilesLimit: 50,
      minYieldMs: 2000,
      encoderIdleSeconds: 600,
      retryBaseMs: 5000,
      retryMaxMs: 600_000,
      stopCutMs: 15_000,
      ...o.deps,
    };
    // An app with no folders never empties its index by itself (DigUp: pruneWanted at launch).
    this.pruneWanted = this.config.folders.length > 0 || this.config.codeFolders.length > 0;
    this.thumbs = new ThumbCache(o.paths.thumbs, () => this.ui(), log);
  }

  // MARK: Lifecycle

  /** Finds the model, opens the index (keyword search works at once), and starts the first pass (a sync). */
  start(): void {
    if (this.started) return;
    this.started = true;
    removeStaleScratch(this.log);
    this.locate();
    this.idleTimer = setInterval(() => this.releaseIdleVectors(), 15_000);
    this.idleTimer.unref();
    this.open();
  }

  /** Opens the indexes; a failure (another process holding the index's lock, a full disk) is tried again later. */
  private open(): void {
    if (this.stopped || this.main) return;
    let main: Part;
    try {
      main = this.openPart(false);
      try {
        main.store.readAgainOnce({ ocr: true, drawsVectorPictures: true });
      } catch (error) {
        main.store.close();
        throw error;
      }
    } catch (error) {
      this.log.error(`engine: can't open the index at ${this.paths.indexDir}: ${message(error)}`);
      this.fail("Can't open the index", error);
      this.retryLater("opening the index", () => this.open());
      return;
    }
    this.main = main;
    if (this.config.codeFolders.length > 0) {
      try {
        this.code = this.openPart(true);
      } catch (error) {
        this.log.error(`engine: can't open the code index: ${message(error)}`);
        this.lastError = { at: Date.now(), message: `Can't open the code index: ${message(error)}` };
      }
    }
    this.retryDelay = 0;
    this.activity = { state: "idle" };
    this.kick();
  }

  /** Runs `again` after a backoff (5 s, doubling to 10 min) unless something starts it sooner. */
  private retryLater(what: string, again: () => void): void {
    if (this.stopped || this.retryTimer) return;
    this.retryDelay =
      this.retryDelay === 0 ? this.deps.retryBaseMs : Math.min(this.retryDelay * 2, this.deps.retryMaxMs);
    this.log.info(`engine: trying ${what} again in ${Math.round(this.retryDelay / 1000)} s`);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      again();
    }, this.retryDelay);
    this.retryTimer.unref();
  }

  /** Stops indexing after its current job (a job still reading after a few seconds is cut short: its files stay
   *  pending), then the model servers and helpers; closes the index. */
  async stop(): Promise<void> {
    if (this.stopped) return;
    this.stopped = true;
    this.stopRequested = true;
    this.installAbort?.abort(new Error("Dig Up is stopping"));
    if (this.idleTimer) clearInterval(this.idleTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.clearCut();
    const settle = (ms: number) =>
      Promise.race([this.serving?.catch(() => {}), new Promise((done) => setTimeout(done, ms).unref())]);
    await settle(3000);
    await Promise.allSettled([this.embedders?.stop(), this.indexHelper?.close(), this.uiHelper?.close()]);
    await settle(3000);
    for (const part of [this.main, this.code]) {
      if (!part) continue;
      part.indexer?.finish();
      part.store.close();
    }
    this.main = null;
    this.code = null;
    rmSync(this.paths.scratch, { recursive: true, force: true });
  }

  private openPart(code: boolean): Part {
    const store = Store.open(code ? this.paths.codeDb : this.paths.mainDb, { code, home: this.deps.home });
    let searcher: Searcher;
    try {
      // Keyword search only until the panel opens: the vectors load then, and go with the query encoder.
      searcher = new Searcher(store, { code, loadVectors: false });
    } catch (error) {
      store.close();
      throw error;
    }
    return {
      code,
      store,
      searcher,
      indexer: null,
      missing: [],
      unreadable: [],
      counts: null,
      countsAt: 0,
      countsStale: true,
      countsMs: 0,
      lastRefresh: 0,
      refreshMs: 0,
      changed: false,
      removed: false,
    };
  }

  private indexOptions(code: boolean): IndexOptions {
    return {
      ...DEFAULT_OPTIONS,
      code,
      excludedFolders: code ? [...this.config.codeSkipped] : [...this.config.skipped],
      excludedExtensions: [...this.config.excludedExtensions],
    };
  }

  private helperFor(): ServiceHelper {
    const mtmd = this.llama ? mtmdBeside(this.llama) : null;
    if (!this.indexHelper || this.indexHelperMtmd !== mtmd) {
      // The helper decodes pictures with llama.cpp's own decoder, as DigUp's embedder does: without it about one photo
      // in ten embeds a little differently from DigUp.
      void this.indexHelper?.close();
      this.indexHelper = this.deps.makeHelper("index", mtmd);
      this.indexHelperMtmd = mtmd;
    }
    return this.indexHelper;
  }

  private ui(): ServiceHelper {
    this.uiHelper ??= this.deps.makeHelper("ui", null);
    return this.uiHelper;
  }

  private newIndexer(part: Part): Indexer {
    return new Indexer({
      store: part.store,
      options: this.indexOptions(part.code),
      helper: this.helperFor(),
      embedder: () => {
        if (!this.embedders) return Promise.reject(new Error("the model isn't there"));
        return this.embedders.index();
      },
      scratch: join(this.paths.scratch, randomUUID()),
      costsFolder: this.paths.indexDir,
      onReset: (indexed, now) => {
        this.log.info(
          `indexer: the model or settings changed, indexing ${part.code ? "code" : "everything"} again (was: ${indexed}; now: ${now})`,
        );
        part.searcher.release();
      },
      home: this.deps.home,
      git: this.deps.git,
      log: this.log,
    });
  }

  // MARK: Settings and holds

  /** Every change of the settings. Folders: prune and sync after the current job; the model's place: look again. */
  setConfig(next: Config): void {
    const before = this.config;
    this.config = next;
    if (before.llamaServerPath !== next.llamaServerPath || before.modelFolder !== next.modelFolder) this.locate();
    const types = !sameList(before.excludedExtensions, next.excludedExtensions);
    const folders = types || !sameList(before.folders, next.folders) || !sameList(before.skipped, next.skipped);
    const code =
      types || !sameList(before.codeFolders, next.codeFolders) || !sameList(before.codeSkipped, next.codeSkipped);
    if (next.codeFolders.length > 0) this.deleteCodeIndex = false;
    if (code && this.main) {
      if (next.codeFolders.length > 0 && !this.code) {
        try {
          this.code = this.openPart(true);
        } catch (error) {
          this.log.error(`engine: can't open the code index: ${message(error)}`);
        }
        this.deleteCodeIndex = false;
      } else if (next.codeFolders.length === 0 && this.code) {
        // Code search off: the code index goes once no pass has it open.
        this.deleteCodeIndex = true;
      }
    }
    if (folders || code) {
      this.summaries = null;
      this.pruneWanted = true;
      this.log.info(`folders: ${next.folders.join(", ") || "none"}; code: ${next.codeFolders.join(", ") || "none"}`);
      if (this.serving) this.endPass(true);
      else this.kick();
    }
    if (before.paused !== next.paused) this.pausedChanged();
  }

  /** From the power policy and the index hours (and pause): `until` is when the hours start again (epoch ms). */
  setHeld(reason: Status["held"], until: number | null = null): void {
    const was = this.policyHeld;
    this.policyHeld = reason === "setup" ? null : reason;
    this.heldUntil = until;
    if (was === this.policyHeld) return;
    if (this.indexingHeld()) {
      if (this.serving) this.endPass(false);
    } else {
      this.kick();
    }
  }

  private pausedChanged(): void {
    this.log.info(this.config.paused ? "indexing paused" : "indexing resumed");
    if (this.indexingHeld()) {
      if (this.serving) this.endPass(false);
    } else {
      this.kick();
    }
  }

  /**
   * Asks the pass to end after its job (`restart`: and a new one to start, with the new settings). A job still on the
   * same file 15 s later is cut short (DigUp: stopHelper(within: 15)): a read stuck in the helper or a long embed would
   * otherwise keep Pause or a folder change waiting. Its files stay pending.
   */
  private endPass(restart: boolean): void {
    if (restart) this.restartRequested = true;
    else this.stopRequested = true;
    this.armCut();
  }

  /** Watches a pass asked to end: each stretch of `stopCutMs` with no job finished ends what it waits on. */
  private armCut(): void {
    if (!this.serving || this.cutTimer) return;
    const job = this.jobSerial;
    this.cutTimer = setTimeout(() => {
      this.cutTimer = null;
      if (!this.serving || !this.shouldEnd()) return;
      // A job ended meanwhile: the pass is on its way out, unless the read it did ahead is what's stuck.
      if (this.jobSerial === job) {
        this.log.info(`indexer: still on a file ${Math.round(this.deps.stopCutMs / 1000)} s after the stop; ending it`);
        const helper = this.indexHelper;
        this.indexHelper = null;
        this.indexHelperMtmd = null;
        void helper?.close();
        void this.embedders?.stopIndexing?.().catch((error) => this.log.warn(`encoder: ${message(error)}`));
      }
      this.armCut();
    }, this.deps.stopCutMs);
    this.cutTimer.unref();
  }

  private clearCut(): void {
    if (this.cutTimer) clearTimeout(this.cutTimer);
    this.cutTimer = null;
  }

  /** The folders the watcher can't watch: for the status. */
  watchProblems(problems: Array<{ folder: string; code: boolean; problem: string }>): void {
    this.watchMissing = new Set(problems.filter((p) => p.problem === "missing").map((p) => `${p.code}:${p.folder}`));
    this.watchUnreadable = new Set(
      problems.filter((p) => p.problem === "unreadable").map((p) => `${p.code}:${p.folder}`),
    );
  }

  private paused(): boolean {
    return this.config.paused || this.policyHeld === "paused";
  }

  /** No pass runs at all: paused, or outside the index hours (search still works). */
  private indexingHeld(): boolean {
    return this.paused() || this.policyHeld === "outside index hours";
  }

  /** The first full pass may run: not held by the power source or heat. */
  private backfillAllowed(): boolean {
    return this.policyHeld === null || !POWER_HOLDS.has(this.policyHeld);
  }

  private held(): Status["held"] {
    if (this.paused()) return "paused";
    if (this.policyHeld === "outside index hours") return "outside index hours";
    if (this.setupState.state !== "ready") return "setup";
    return this.policyHeld;
  }

  // MARK: Setup

  /** Where llama-server and the model are; the embedders follow. New embedders restart a pass that used the old ones,
   *  and indexing starts once both are there (a model folder chosen in the settings, a finished download). */
  private locate(): void {
    const wasReady = this.modelReady();
    const llama = this.deps.findLlama(this.paths, this.config.llamaServerPath);
    const models = this.deps.findModels(this.paths, this.config.modelFolder);
    this.llama = llama.bin;
    this.models = models.text === null ? null : { text: models.text, media: models.media };
    const missing: Array<"model-text" | "model-media" | "llama"> = [];
    if (models.text === null) missing.push("model-text");
    if (models.media === null) missing.push("model-media");
    if (llama.bin === null) missing.push("llama");
    if (!this.installing) {
      this.setupState = missing.length === 0 ? { state: "ready" } : { state: "missing", missing };
    }
    const files = llama.bin && this.models ? `${llama.bin}|${this.models.text}|${this.models.media}` : "";
    if (files !== this.embedderFiles) {
      // First: the job that fails as its embedder stops is then cut short on purpose, not a failure.
      if (this.embedders && this.serving) this.endPass(true);
      void this.embedders?.stop();
      this.embedders = null;
      this.vectorCache.clear();
      this.embedderFiles = files;
      if (llama.bin && this.models) {
        this.embedders = this.deps.makeEmbedders({
          server: llama.bin,
          text: this.models.text,
          media: this.models.media,
        });
      }
    }
    if (this.started && !wasReady && this.modelReady()) this.requestSync();
  }

  /** Indexing needs both model files and llama-server; queries need the text model alone. */
  private modelReady(): boolean {
    return this.embedders !== null && this.models?.media != null;
  }

  /** Finds or downloads llama.cpp and the model, with progress in `Status.setup`. A chosen model folder is the only
   *  place looked in, and where the download goes. Network problems are waited out ("Waiting for the network…"). */
  setup(): Promise<void> {
    if (this.installing) return this.installing;
    this.locate();
    if (this.setupState.state === "ready") return Promise.resolve();
    const controller = new AbortController();
    this.installAbort = controller;
    // The reply to POST /setup shows the download as started; the first progress comes a moment later.
    this.setupState = { state: "downloading", what: this.llama ? TEXT_MODEL.name : "llama.cpp", bytes: 0, total: 0 };
    const run = async () => {
      const progress = (p: InstallProgress) => this.onProgress(p);
      try {
        if (!this.llama)
          await this.deps.installLlama(this.paths, progress, { log: this.log, signal: controller.signal });
        if (!this.models?.media) {
          const target = this.config.modelFolder ? { ...this.paths, modelsDir: this.config.modelFolder } : this.paths;
          await this.deps.installModels(target, progress, { log: this.log, signal: controller.signal });
        }
        this.installing = null;
        this.locate();
        if (this.setupState.state === "ready") {
          this.log.info("setup: llama.cpp and the model are ready");
          this.requestSync();
        }
      } catch (error) {
        if (controller.signal.aborted) return; // Dig Up is stopping
        this.log.error(`setup: ${message(error)}`);
        this.setupState = { state: "failed", error: message(error) };
      } finally {
        this.installing = null;
        this.installAbort = null;
        this.rate = null;
      }
    };
    this.installing = run();
    return this.installing;
  }

  private onProgress(p: InstallProgress): void {
    if (p.phase === "verifying") {
      this.setupState = { state: "verifying", what: p.what };
      return;
    }
    const now = Date.now();
    if (!this.rate || p.bytes < this.rate.bytes) this.rate = { at: now, bytes: p.bytes, perSecond: null };
    else if (now - this.rate.at >= 1000) {
      const measured = ((p.bytes - this.rate.bytes) * 1000) / (now - this.rate.at);
      const perSecond = this.rate.perSecond === null ? measured : 0.7 * this.rate.perSecond + 0.3 * measured;
      this.rate = { at: now, bytes: p.bytes, perSecond };
    }
    const state: SetupState = { state: "downloading", what: p.what, bytes: p.bytes, total: p.total };
    if (this.rate.perSecond !== null && p.phase !== "retrying") state.bytesPerSecond = Math.round(this.rate.perSecond);
    if (p.phase === "retrying") state.waiting = "Waiting for the network…";
    this.setupState = state;
  }

  // MARK: Indexing passes

  /** Asks for a sync (DigUp: the watcher's requestSync). A pass that runs takes it once it may yield. */
  requestSync(index?: "main" | "code"): void {
    if (index !== "code") this.syncRequested = true;
    if (index !== "main" && this.code) this.codeSyncRequested = true;
    if (!this.serving && (this.syncRequested || this.codeSyncRequested)) this.kick();
  }

  /** Starts a pass unless one runs or indexing is held (DigUp: startHelper). A pass syncs first. */
  private kick(): void {
    if (this.stopped || !this.main || this.serving || this.rebuilding > 0) return;
    if (this.indexingHeld()) return;
    if (this.config.folders.length === 0 && this.config.codeFolders.length === 0 && !this.pruneWanted) {
      this.removeCodeIndexIfAsked();
      return;
    }
    if (this.retryTimer) clearTimeout(this.retryTimer); // a pass now replaces one planned for later
    this.retryTimer = null;
    this.syncRequested = true;
    this.codeSyncRequested = this.code !== null;
    this.stopRequested = false;
    this.restartRequested = false;
    let failed = false;
    const pass = this.serve()
      .then((ok) => {
        failed = !ok;
      })
      .catch((error) => {
        failed = true;
        this.fail("Indexing stopped", error);
      })
      .finally(() => {
        if (this.serving === pass) this.serving = null;
        this.clearCut();
        this.removeCodeIndexIfAsked();
        if (this.stopped) return;
        // A failed pass is tried again later, not at once (a changed setting may fix it: that one starts now).
        if (failed && !this.restartRequested) return this.retryLater("indexing", () => this.kick());
        if (!failed) this.retryDelay = 0;
        // The folders changed meanwhile, or a sync came in as the pass ended.
        if (this.restartRequested || this.syncRequested || (this.code && this.codeSyncRequested)) this.kick();
      });
    this.serving = pass;
  }

  private shouldEnd(): boolean {
    return this.stopped || this.stopRequested || this.restartRequested || this.indexingHeld();
  }

  /** One pass; false when it failed (it's tried again later). */
  private async serve(): Promise<boolean> {
    // Its first steps are synchronous (a prune, emptying an index): they start on a later turn of the event loop, so a
    // daemon starting a pass answers meanwhile, and a pass that fails at once can't start the next one in a loop.
    await new Promise<void>((done) => setImmediate(done));
    const main = this.main;
    if (!main || this.shouldEnd()) return true;
    const code = this.code;
    if (this.activity.state === "failed") this.activity = { state: "idle" };
    const passStarted = Date.now();
    let fatal = false;
    try {
      this.beginPass(main, code);
      let newFiles = new Set<number>();
      let newCode = new Set<number>();
      let codeCounted = code === null;
      for (;;) {
        if (this.syncRequested) {
          this.syncRequested = false;
          await this.sync(main, newFiles);
        }
        // The code folders are crawled with the first sync, so their counts show from the start.
        if (!codeCounted && code) {
          codeCounted = true;
          if (this.codeSyncRequested) {
            this.codeSyncRequested = false;
            await this.sync(code, newCode);
          }
        }
        if (this.shouldEnd()) break;
        // Before the model is there, files are found and named (searchable by name), nothing is embedded.
        if (!this.modelReady()) break;
        if (newFiles.size > 0) {
          if (!(await this.run(main, newFiles))) {
            fatal = true;
            break;
          }
          newFiles = this.left(main, newFiles);
          continue;
        }
        if (main.store.pendingCount() > 0 && this.backfillAllowed()) {
          if (!(await this.run(main, null))) {
            fatal = true;
            break;
          }
          if (this.syncRequested || this.shouldEnd()) continue;
        }
        // The code index once the main one has nothing waiting: its own sync, what it just queued, then the rest.
        if (code && (main.store.pendingCount() === 0 || !this.backfillAllowed())) {
          if (this.codeSyncRequested) {
            this.codeSyncRequested = false;
            await this.sync(code, newCode);
          }
          if (newCode.size > 0) {
            if (!(await this.run(code, newCode))) {
              fatal = true;
              break;
            }
            newCode = this.left(code, newCode);
            continue;
          }
          if (code.store.pendingCount() > 0 && this.backfillAllowed()) {
            if (!(await this.run(code, null))) {
              fatal = true;
              break;
            }
            if (this.syncRequested || this.codeSyncRequested || this.shouldEnd()) continue;
          }
        }
        // Once nothing is waiting: the rest of long PDFs and documents, the same way.
        if (
          this.backfillAllowed() &&
          main.store.pendingCount() === 0 &&
          (code?.store.pendingCount() ?? 0) === 0 &&
          main.store.unfinishedCount().files > 0
        ) {
          if (!(await this.finishLongFiles(main))) {
            fatal = true;
            break;
          }
          if (this.syncRequested || this.codeSyncRequested || this.shouldEnd()) continue;
        }
        if (this.syncRequested || (code && this.codeSyncRequested)) continue;
        break;
      }
      // The engine works again: an engine problem from before this pass is over (one from this pass stays shown).
      if (!fatal && this.lastError && !this.lastError.path && this.lastError.at < passStarted) this.lastError = null;
      return !fatal;
    } finally {
      if (!fatal) this.activity = { state: "idle" };
      this.embedders?.doneIndexing();
      for (const part of [main, code]) {
        if (!part) continue;
        // Each pass makes its own indexers: this one's scratch folder goes now.
        part.indexer?.finish();
        part.indexer = null;
        this.refreshSearcher(part, true);
        part.countsStale = true;
      }
      this.summaries = null;
    }
  }

  /** A pass's first steps: prune what's no longer chosen, and empty an index whose model or settings changed. */
  private beginPass(main: Part, code: Part | null): void {
    main.indexer = this.newIndexer(main);
    if (code) code.indexer = this.newIndexer(code);
    if (this.pruneWanted) {
      const pruned = main.store.prune(this.config.folders);
      if (pruned > 0) {
        this.log.info(`indexer: ${pruned} files under folders no longer chosen left the index`);
        main.removed = true;
      }
      if (code) {
        const prunedCode = code.store.prune(this.config.codeFolders);
        if (prunedCode > 0) {
          this.log.info(`indexer: ${prunedCode} files under code folders no longer chosen left the code index`);
          code.removed = true;
        }
      }
      // Only once it's done: a prune that failed (the index locked by another process) is tried with the next pass.
      this.pruneWanted = false;
    }
    for (const part of [main, code]) part?.indexer?.checkModel();
  }

  /** New files a run stopped before (a sync or a stop came first): kept for the next round. */
  private left(part: Part, files: Set<number>): Set<number> {
    const yielded = this.syncRequested || this.shouldEnd() || (part.code && this.codeSyncRequested);
    return yielded ? new Set(part.store.pending(null, files).map((file) => file.id)) : new Set();
  }

  /** A part's chosen folders that are there and readable right now; also what `pending` and the counts look at. */
  private availableRoots(part: Part): string[] {
    const roots = part.code ? this.config.codeFolders : this.config.folders;
    const missing = roots.filter((root) => !isFolder(root));
    const unreadable = roots.filter((root) => !missing.includes(root) && !isReadable(root));
    if (!sameList(missing, part.missing) || !sameList(unreadable, part.unreadable)) {
      if (missing.length > 0) this.log.info(`indexer: not connected: ${missing.join(", ")}`);
      if (unreadable.length > 0) this.log.info(`indexer: no access: ${unreadable.join(", ")}`);
    }
    part.missing = missing;
    part.unreadable = unreadable;
    const available = roots.filter((root) => !missing.includes(root) && !unreadable.includes(root));
    part.store.scope = available;
    return available;
  }

  private async sync(part: Part, into: Set<number>): Promise<void> {
    const started = Date.now();
    this.activity = { state: "syncing", index: part.code ? "code" : "main" };
    try {
      const summary = await part.indexer!.sync(this.availableRoots(part));
      if (summary.crawl.failedPaths?.length) {
        const problem = `Couldn't read ${summary.crawl.failedPaths.length} paths; their indexed files were kept`;
        this.log.warn(`${problem}: ${summary.crawl.failedPaths.join(", ")}`);
        this.lastError = { at: Date.now(), message: problem };
      }
      if (summary.queued.length <= this.deps.newFilesLimit) for (const id of summary.queued) into.add(id);
      this.log.info(
        `${part.code ? "code sync" : "sync"}: ${summary.added} new · ${summary.changed} changed · ${summary.moved} moved · ` +
          `${summary.removed} removed · ${summary.unchanged} unchanged in ${Date.now() - started} ms`,
      );
      part.searcher.reloadFiles();
      if (summary.changed + summary.removed > 0) part.removed = true;
      part.countsStale = true;
      this.summaries = null;
    } catch (error) {
      if (this.shouldEnd()) {
        // A walk cut short by a pause or a change of folders: the next pass walks again.
        this.log.info(`indexer: ${part.code ? "code " : ""}sync stopped: ${message(error)}`);
        return;
      }
      this.log.error(`indexer: ${part.code ? "code " : ""}sync failed: ${message(error)}`);
      this.lastError = { at: Date.now(), message: `Couldn't look through the folders: ${message(error)}` };
    } finally {
      this.jobSerial++;
      this.yieldAt = Date.now() + Math.max(Date.now() - started, this.deps.minYieldMs);
    }
  }

  /** Reads and embeds a part's pending files (`only` some). False when indexing has to stop. */
  private async run(part: Part, only: Set<number> | null): Promise<boolean> {
    const started = Date.now();
    const isNew = only !== null;
    const index = part.code ? "code" : "main";
    let current: { path: string; kind: FileKind } | null = null;
    let done = 0;
    let total = isNew ? only.size : part.store.pendingCount();
    const show = () => {
      this.activity = {
        state: "indexing",
        index,
        pass: isNew ? "new" : "first",
        done,
        total,
        current,
        secondsLeft:
          done >= 3 && total > done ? Math.round(((Date.now() - started) / 1000 / done) * (total - done)) : null,
      };
    };
    show();
    try {
      const states = await part.indexer!.run({
        only,
        shouldStop: () =>
          this.shouldEnd() ||
          (!isNew && !this.backfillAllowed()) ||
          (Date.now() >= this.yieldAt && (this.syncRequested || (part.code && this.codeSyncRequested))),
        onStart: (file: FileRecord) => {
          this.jobSerial++;
          current = { path: file.path, kind: file.kind };
          show();
        },
        onEvent: (event) => {
          this.jobSerial++;
          part.changed = true;
          done = event.done;
          total = event.total;
          show();
          this.refreshSearcher(part, false);
        },
      });
      if (Object.keys(states).length > 0) {
        const what = part.code ? "code" : isNew ? "new files" : "backfill";
        const line = Object.entries(states)
          .sort()
          .map(([state, n]) => `${n} ${state}`)
          .join(" · ");
        this.log.info(`index: ${what}: ${line} in ${Date.now() - started} ms`);
      }
      return true;
    } catch (error) {
      return this.runFailed(error);
    }
  }

  /** A run that threw: cut short on purpose (a pause, new settings, the 15 s cut: its files stay pending), or failed. */
  private runFailed(error: unknown): boolean {
    if (this.shouldEnd()) {
      this.log.info(`index: stopped mid-job: ${message(error)}`);
      return true;
    }
    this.fail("Indexing stopped", error);
    return false;
  }

  /** The rest of long files, yielding as the first pass does. False when indexing has to stop. */
  private async finishLongFiles(part: Part): Promise<boolean> {
    const started = Date.now();
    let current: { path: string; kind: FileKind } | null = null;
    this.activity = { state: "indexing", index: "main", pass: "rest", done: 0, total: 0, current, secondsLeft: null };
    try {
      const states = await part.indexer!.finishLongFiles({
        shouldStop: () =>
          this.shouldEnd() ||
          !this.backfillAllowed() ||
          (Date.now() >= this.yieldAt && (this.syncRequested || (this.code !== null && this.codeSyncRequested))),
        onStart: (file) => {
          this.jobSerial++;
          current = { path: file.path, kind: file.kind };
          if (this.activity.state === "indexing") this.activity = { ...this.activity, current };
        },
        onStep: (step) => {
          this.jobSerial++;
          part.changed = true;
          const elapsed = (Date.now() - started) / 1000;
          this.activity = {
            state: "indexing",
            index: "main",
            pass: "rest",
            done: step.done,
            total: step.total,
            current,
            secondsLeft:
              step.done > 0 && step.total > step.done
                ? Math.round((elapsed / step.done) * (step.total - step.done))
                : null,
          };
          this.refreshSearcher(part, false);
        },
      });
      if (Object.keys(states).length > 0) {
        this.log.info(`index: the rest of long files: ${JSON.stringify(states)} in ${Date.now() - started} ms`);
      }
      return true;
    } catch (error) {
      return this.runFailed(error);
    }
  }

  private fail(problem: string, error: unknown): void {
    this.log.error(`engine: ${problem}: ${message(error)}`);
    this.activity = { state: "failed", problem };
    this.lastError = { at: Date.now(), message: `${problem}: ${message(error)}` };
  }

  /** Code search was turned off: its index goes once no pass has it open. */
  private removeCodeIndexIfAsked(): void {
    if (!this.deleteCodeIndex || this.serving) return;
    this.deleteCodeIndex = false;
    if (this.code) {
      this.code.indexer?.finish();
      this.code.store.close();
      this.code = null;
    }
    for (const suffix of ["", "-wal", "-shm"]) rmSync(this.paths.codeDb + suffix, { force: true });
    this.log.info("code search off: the code index was deleted");
  }

  /**
   * New vectors reach search (DigUp: the whole copy is read again at most every 2 s during a pass). Here a pass's new
   * vectors are appended, which costs what they cost; only rows removed by a sync or a prune make the searcher read
   * everything again (a second or more for a few hundred thousand vectors, on the daemon's one thread), and then at most
   * every 10 times the last full read took. If no search has loaded vectors lately, nothing is read during the pass;
   * at its end (`force`) the vectors' model is, and the vectors load fresh with the next search.
   */
  private refreshSearcher(part: Part, force: boolean): void {
    const now = Date.now();
    part.countsStale = true;
    if (!part.changed && !part.removed) return;
    const searcher = part.searcher;
    if (!searcher.vectorsLoaded) {
      if (!force) return;
      part.changed = part.removed = false;
      this.guarded(() => searcher.reloadFiles());
      return;
    }
    if (part.removed) {
      if (!force && now - part.lastRefresh < Math.max(2000, 10 * part.refreshMs)) return;
      part.changed = part.removed = false;
      part.lastRefresh = now;
      this.guarded(() => searcher.reload());
      part.refreshMs = Date.now() - now;
      return;
    }
    if (!force && now - part.lastRefresh < 2000) return;
    part.changed = false;
    part.lastRefresh = now;
    this.guarded(() => searcher.appendNew());
  }

  private guarded(read: () => unknown): void {
    try {
      read();
    } catch (error) {
      this.log.warn(`engine: can't reload the searcher: ${message(error)}`);
    }
  }

  /** Drops everything embedded (names stay) and reads it all again: after a model or settings change by hand. */
  async reindex(code: boolean | { code?: boolean }): Promise<void> {
    const which = typeof code === "boolean" ? code : code.code === true;
    this.rebuilding++;
    try {
      const running = this.serving;
      if (running) {
        this.endPass(false);
        await running;
      }
      if (this.stopped) return;
      // Config may have changed while the pass stopped (including deleting the code index).
      const part = which ? this.code : this.main;
      if (!part) return;
      part.store.resetAll();
      part.searcher.release();
      part.searcher.reloadFiles();
      part.countsStale = true;
      this.summaries = null;
      this.log.info(`engine: ${which ? "the code index" : "the index"} is read again from scratch`);
      this.requestSync(which ? "code" : "main");
    } finally {
      this.rebuilding--;
      this.kick();
    }
  }

  // MARK: Status

  private countsOf(part: Part | null): IndexCounts | null {
    if (!part) return null;
    const now = Date.now();
    // Counting runs over the whole index: at most once a second while indexing changes it, every 5 s otherwise, and
    // never more than a twentieth of the time (a third of a second on half a million files).
    const age = now - part.countsAt;
    const least = 20 * part.countsMs;
    if (!part.counts || (part.countsStale && age >= Math.max(1000, least)) || age > Math.max(5000, least)) {
      try {
        part.counts = indexCounts(part.store);
        part.countsAt = now;
        part.countsMs = Date.now() - now;
        part.countsStale = false;
      } catch (error) {
        this.log.warn(`engine: can't count the index: ${message(error)}`);
      }
    }
    return part.counts;
  }

  private emptyCounts(): IndexCounts {
    return { byKind: {}, total: emptyKindCounts(), vectors: 0, segments: 0, unfinished: { files: 0, units: 0 } };
  }

  private encoderState(): Status["encoder"] {
    if (!this.embedders) return "off";
    return this.embedders.state();
  }

  status(): Status {
    const now = Date.now();
    if (!this.summaries || now - this.summaries.at > Math.max(3000, 20 * this.summariesMs)) {
      const problems = (part: Part | null, code: boolean) => ({
        missing: new Set([
          ...(part?.missing ?? []),
          ...[...this.watchMissing]
            .filter((key) => key.startsWith(`${code}:`))
            .map((key) => key.slice(String(code).length + 1)),
        ]),
        unreadable: new Set([
          ...(part?.unreadable ?? []),
          ...[...this.watchUnreadable]
            .filter((key) => key.startsWith(`${code}:`))
            .map((key) => key.slice(String(code).length + 1)),
        ]),
      });
      try {
        this.summaries = {
          main: folderSummaries(this.main?.store ?? null, this.config.folders, problems(this.main, false)),
          code:
            this.config.codeFolders.length > 0
              ? folderSummaries(this.code?.store ?? null, this.config.codeFolders, problems(this.code, true))
              : [],
          at: now,
        };
        this.summariesMs = Date.now() - now;
      } catch (error) {
        this.log.warn(`engine: can't sum up the folders: ${message(error)}`);
      }
    }
    const mainSummaries = this.summaries?.main ?? [];
    const codeSummaries = this.summaries?.code ?? [];
    return {
      apiVersion: API_VERSION,
      pid: process.pid,
      setup: this.setupState,
      activity: this.activity,
      held: this.held(),
      main: this.countsOf(this.main) ?? this.emptyCounts(),
      code: this.config.codeFolders.length > 0 ? (this.countsOf(this.code) ?? this.emptyCounts()) : null,
      encoder: this.encoderState(),
      lastError: this.lastError,
      folders: [...this.config.folders],
      codeFolders: [...this.config.codeFolders],
      heldUntil: this.policyHeld === "outside index hours" ? this.heldUntil : null,
      missingFolders: mainSummaries.filter((s) => s.missing).map((s) => s.folder),
      unreadableFolders: mainSummaries.filter((s) => s.unreadable && !s.missing).map((s) => s.folder),
      codeMissingFolders: codeSummaries.filter((s) => s.missing).map((s) => s.folder),
      codeUnreadableFolders: codeSummaries.filter((s) => s.unreadable && !s.missing).map((s) => s.folder),
      startedAt: this.startedAt,
      folderSummaries: mainSummaries,
      codeFolderSummaries: codeSummaries,
    };
  }

  // MARK: Search

  private static cacheKey(text: string, code: boolean): string {
    return code ? `code\u0000${text}` : text;
  }

  private remember(key: string, vector: Float32Array): void {
    this.vectorCache.delete(key);
    this.vectorCache.set(key, vector);
    while (this.vectorCache.size > VECTOR_CACHE) this.vectorCache.delete(this.vectorCache.keys().next().value!);
  }

  /** Starts the query encoder in the background (opening the panel, a keystroke while it's off). */
  private warmEncoder(): void {
    const embedders = this.embedders;
    if (!embedders || embedders.state() === "ready") return;
    embedders.query().catch((error) => this.log.warn(`encoder: can't start: ${message(error)}`));
  }

  /**
   * The query's vector: cached, or embedded now when the encoder is ready. While it starts, none ("warming": it starts
   * in the background, and the views ask again); without the model or after a failed start, none ("unavailable").
   */
  private async vectorFor(
    text: string,
    code: boolean,
  ): Promise<{ vector: Float32Array | null; note: SearchResponse["note"] }> {
    const key = Service.cacheKey(text, code);
    const cached = this.vectorCache.get(key);
    if (cached) return { vector: cached, note: null };
    const embedders = this.embedders;
    if (!embedders) return { vector: null, note: "unavailable" };
    const state = embedders.state();
    if (state !== "ready") {
      this.warmEncoder();
      return { vector: null, note: state === "failed" ? "unavailable" : "warming" };
    }
    try {
      const worker = await embedders.query();
      const [vector] = await worker.embedTexts([code ? Prompts.codeQuery(text) : Prompts.query(text)]);
      this.remember(key, vector);
      return { vector, note: null };
    } catch (error) {
      this.log.warn(`encoder: ${message(error)}`);
      return { vector: null, note: "unavailable" };
    }
  }

  /** Embeds what's typed so far (the keyword phase), so the vector is usually ready when typing pauses. Text that's
   *  no longer the newest typed by the time the encoder can take it is skipped. */
  private embedAhead(text: string, code: boolean): void {
    const key = Service.cacheKey(text, code);
    this.newestTyped = key;
    const embedders = this.embedders;
    if (!embedders || this.vectorCache.has(key)) return;
    if (embedders.state() !== "ready") return this.warmEncoder();
    void (async () => {
      try {
        const worker = await embedders.query();
        if (this.newestTyped !== key) return;
        const [vector] = await worker.embedTexts([code ? Prompts.codeQuery(text) : Prompts.query(text)]);
        this.remember(key, vector);
      } catch (error) {
        this.log.warn(`encoder: ${message(error)}`);
      }
    })();
  }

  /**
   * Hybrid search (DigUp: Engine.search). Keyword results come at once (`meaning: false`, which also starts embedding
   * the text); the final search adds meaning. A "code:" query searches the code index alone. Results are only files
   * still searched (chosen and not skipped, a type not left out) that are still there. Unavailable files do not consume the result limit.
   */
  async search(r: SearchRequest, signal?: AbortSignal): Promise<SearchResponse> {
    const began = performance.now();
    const query = r.query.trim();
    const codeText = codeQueryText(query);
    const isCode = codeText !== null;
    const text = codeText ?? query;
    const reply = (part: Partial<SearchResponse>): SearchResponse => ({
      hits: [],
      strong: 0,
      code: isCode,
      meaning: false,
      note: null,
      terms: [],
      ms: { embed: 0, search: Math.round(performance.now() - began) },
      ...part,
    });
    if (isCode && this.config.codeFolders.length === 0) return reply({ note: "code-off" });
    if (isCode && text === "") return reply({ note: "code-hint" });
    if (text === "") return reply({});
    const part = isCode ? this.code : this.main;
    if (!part) return reply({ note: isCode ? "code-off" : null });
    this.lastQueryAt = Date.now();

    let vector: Float32Array | null = null;
    let note: SearchResponse["note"] = null;
    const embedStarted = performance.now();
    if (r.meaning === false) {
      this.embedAhead(text, isCode);
    } else {
      ({ vector, note } = await this.vectorFor(text, isCode));
    }
    const embedMs = Math.round(performance.now() - embedStarted);
    signal?.throwIfAborted();
    const indexed = part.searcher.vectorSource;
    if (vector && indexed !== null && indexed !== VECTOR_SOURCE) {
      if (!this.warnedAboutSource) {
        this.log.warn(`meaning search is off: the index was built with ${indexed}, the encoder is ${VECTOR_SOURCE}`);
        this.warnedAboutSource = true;
      }
      vector = null;
      note = "unavailable";
    }
    const searchStarted = performance.now();
    const hits = part.searcher.search(text, vector, {
      kinds: isCode ? null : (r.kinds ?? null),
      limit: r.limit ?? 40,
      prefixLast: r.prefixLast ?? false,
      acceptPath: (path) => this.stillSearched(path, isCode),
    });
    return {
      hits,
      strong: strongCount(hits.map((hit) => hit.score)),
      code: isCode,
      meaning: vector !== null,
      note,
      terms: Searcher.terms(text),
      ms: { embed: embedMs, search: Math.round(performance.now() - searchStarted) },
    };
  }

  /** A removed folder's rows (or a newly skipped type's) can outlive it until the next sync: they're not results. */
  private stillSearched(path: string, code: boolean): boolean {
    const folders = code ? this.config.codeFolders : this.config.folders;
    const skipped = code ? this.config.codeSkipped : this.config.skipped;
    if (!FolderSelection.isSearched(path, folders, skipped)) return false;
    if (!code && this.config.excludedExtensions.includes(lowercased(pathExtension(lastPathComponent(path)))))
      return false;
    return existsSync(path);
  }

  /** Gets meaning search ready as a search view opens: starts the query encoder and loads the vectors. */
  async prewarm(signal?: AbortSignal): Promise<Status["encoder"]> {
    this.lastQueryAt = Date.now();
    this.warmEncoder();
    for (const part of [this.main, this.code]) {
      signal?.throwIfAborted();
      if (!part || part.searcher.vectorsLoaded) continue;
      const started = Date.now();
      try {
        part.searcher.reload();
        part.changed = part.removed = false;
        this.log.info(
          `engine: ${part.searcher.vectorCount} ${part.code ? "code " : ""}vectors loaded in ${Date.now() - started} ms`,
        );
      } catch (error) {
        this.log.warn(`engine: can't load vectors: ${message(error)}`);
      }
    }
    return this.encoderState();
  }

  /** The vectors held for search go with the query encoder (DigUp: encoderIdleSeconds); words still match. */
  private releaseIdleVectors(): void {
    const idle = Date.now() - this.lastQueryAt > this.deps.encoderIdleSeconds * 1000;
    if (!idle || this.encoderState() === "ready" || this.encoderState() === "starting") return;
    let released = false;
    for (const part of [this.main, this.code]) {
      if (part?.searcher.vectorsLoaded) {
        part.searcher.release();
        released = true;
      }
    }
    if (released) {
      this.vectorCache.clear();
      this.log.info("engine: the query encoder is idle; its vectors were let go");
    }
  }

  /** A segment's full text, for the preview (DigUp: Searcher.text(ofSegment:)). */
  segmentText(segmentId: number | { segmentId: number; code?: boolean }, code = false): string | null {
    const id = typeof segmentId === "number" ? segmentId : segmentId.segmentId;
    const which = typeof segmentId === "number" ? code : segmentId.code === true;
    return (which ? this.code : this.main)?.searcher.segmentText(id) ?? null;
  }

  // MARK: Folders, files, previews

  files(r: FileListRequest): FileListItem[] {
    const part = r.code ? this.code : this.main;
    if (!part) return [];
    return part.store.list({ states: r.states ?? null, kinds: r.kinds ?? null, limit: r.limit ?? null });
  }

  suggestCodeFolders(): string[] {
    return suggestCodeFolders(this.config.folders, this.deps.home);
  }

  access(
    folders: string[] | { folders: string[] },
    signal?: AbortSignal,
  ): Promise<{ folder: string; readable: boolean; error?: string }[]> {
    return access(Array.isArray(folders) ? folders : folders.folders, signal);
  }

  /** First-pass time of each folder, with its subfolders (DigUp: digup estimate). Folders come back as given. The walk
   *  of one folder can't be cut short; an abort stops between folders and between page and duration lookups. */
  async estimate(r: EstimateRequest, signal?: AbortSignal): Promise<FolderEstimate[]> {
    signal?.throwIfAborted();
    const costs = MeasuredCosts.load(this.paths.indexDir).costs;
    const options = this.indexOptions(r.code === true);
    // A helper of its own (DigUp runs `digup estimate` as its own process): a big walk never holds up previews or
    // indexing, and an abort ends the walk under way by ending the helper.
    const helper = this.deps.makeHelper("ui", null);
    const abort = () => void helper.close();
    signal?.addEventListener("abort", abort, { once: true });
    const out: FolderEstimate[] = [];
    try {
      for (const folder of r.folders) {
        signal?.throwIfAborted();
        try {
          out.push(await estimateFolder(folder, options, costs, helper, signal));
        } catch (error) {
          if (signal?.aborted) throw signal.reason ?? error;
          this.log.warn(`estimate: ${folder}: ${message(error)}`);
          out.push({ folder, files: 0, byKind: {}, skipped: {}, seconds: 0, laterSeconds: 0, failed: true });
        }
      }
      return out;
    } finally {
      signal?.removeEventListener("abort", abort);
      await helper.close();
    }
  }

  thumb(r: ThumbRequest, signal?: AbortSignal): Promise<ThumbResponse> {
    return this.thumbs.thumb(r, signal);
  }

  openPdf(r: OpenPdfRequest): Promise<OpenResponse> {
    return this.ui().openPdf(r.path, r.page, r.words);
  }

  openMedia(r: OpenMediaRequest): Promise<OpenResponse> {
    return this.ui().openMedia(r.path, r.seconds, r.player);
  }
}
