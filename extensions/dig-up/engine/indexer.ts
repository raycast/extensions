// Keeps an index in step with its folders, then reads and embeds whatever is pending (DigUp: Indexer.swift).
//
// Reading (the Swift helper: ImageIO, Vision, PDFKit, AVFoundation; text and code here) and embedding (llama-server)
// are separate processes, so they overlap: while the model embeds job N, job N+1 is read (`process`). Each job's
// segments are written in one transaction after its vectors are back, so stopping between jobs loses nothing.

import { existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { readCode, summary, type CodeFile } from "./code";
import { crawl, standardized, type CrawlReport } from "./crawler";
import type { Embedder } from "./embedder";
import { MeasuredCosts } from "./estimator";
import { HelperError, type Helper, type MediaPiece, type PdfItem } from "./helper";
import type { Log } from "./log";
import { deletingPathExtension, fileSystemForm, lastPathComponent, pathExtension } from "./rules";
import { graphemeCount, graphemePrefix, hasWords, lowercased } from "./searchtext";
import type { FileRecord, Store } from "./store";
import { ExtractError, chunks as cutChunks, excerpt, plainTextFromHTML, readTextFile } from "./text";
import { optionsFingerprint, Prompts, VECTOR_SOURCE, type FileKind, type FileState, type IndexOptions } from "./types";

export class IndexerError extends Error {
  constructor(
    readonly indexed: string,
    readonly now: string,
  ) {
    super(
      `this index was built with different settings or model:\n  index: ${indexed}\n  now:   ${now}\n` +
        "re-run with --reindex (vectors from different settings can't be compared)",
    );
    this.name = "IndexerError";
  }
}

export interface SyncSummary {
  added: number;
  changed: number;
  moved: number;
  removed: number;
  unchanged: number;
  crawl: CrawlReport;
  /** Files this sync queued (new or changed), so they can be indexed first. */
  queued: number[];
}

export interface IndexEvent {
  done: number;
  total: number;
  path: string;
  kind: FileKind;
  state: FileState;
  /** Seconds per file of its job. */
  seconds: number;
  note: string | null;
}

/** One step of the later pass: `done` of the `total` pages and chunks it set out to read, in `files` files. */
export interface StepEvent {
  done: number;
  total: number;
  /** Long files not finished yet, this one included until its last step. */
  files: number;
  path: string;
  kind: FileKind;
  state: FileState;
  seconds: number;
  note: string | null;
}

/** The helper ops the indexer uses (tests pass fakes). */
export type IndexerHelper = Pick<Helper, "walk" | "image" | "pdf" | "rich" | "audio" | "video">;

export interface IndexerOptions {
  store: Store;
  options: IndexOptions;
  helper: IndexerHelper;
  /** The index embedder (text + images + audio), started on first use. */
  embedder: () => Promise<Embedder>;
  /** Where this indexer's job folders go; removed by `finish()`. */
  scratch: string;
  /** The folder of costs.json (what indexing costs on this Mac); null keeps nothing. */
  costsFolder?: string | null;
  /** The vectors' model (DigUp: Worker.vectorSource), known without starting the model. */
  vectorSource?: string;
  /** When set, an index built with another model or settings is emptied and read again, and this hears of it. When
   *  null, indexing stops with `IndexerError`. */
  onReset?: ((indexed: string, now: string) => void) | null;
  home?: string;
  /** The git that says which files a repo keeps (code index); undefined finds one. */
  git?: string | null;
  log?: Log;
}

interface Job {
  files: FileRecord[];
  /** A long file's later step: pages of a PDF or chunks of a document to read, from 0. */
  step: { from: number; to: number } | null;
}

interface Outcome {
  state: FileState;
  detail: string | null;
}

interface ReadyImage {
  slot: number;
  path: string;
  width: number;
  height: number;
  taken?: string;
  ocr: string;
}

type Payload =
  | { kind: "nothing" }
  | { kind: "images"; screenshot: boolean; ready: ReadyImage[] }
  /** `read`: the pages read (from 0) of the PDF's `total`. */
  | { kind: "pdf"; pages: PdfItem[]; read: { from: number; to: number }; total: number; title: string | null }
  /** `chunks`: those in `read` (from 0) of the document's `total` (counted up to maxChunks + 1). */
  | { kind: "doc"; chunks: string[]; read: { from: number; to: number }; total: number; characters: number }
  | { kind: "audio"; pieces: MediaPiece[]; duration: number }
  | { kind: "video"; frames: MediaPiece[]; sound: MediaPiece[]; duration: number }
  | { kind: "code"; file: CodeFile };

interface Prepared {
  batch: FileRecord[];
  step: { from: number; to: number } | null;
  folder: string;
  /** Files already settled while reading (skipped or failed), by slot. */
  outcomes: Map<number, Outcome>;
  payload: Payload;
  /** A problem that stops the whole run (the helper can't start, or was closed): files stay pending. */
  fatal: Error | null;
}

type Result = [FileState, string | null];

/** Helper errors that end a run instead of failing a file: the helper itself can't work. */
const FATAL_HELPER = new Set(["spawn", "closed"]);

/** Swift's `text.count` (Characters), bounded: a huge text with many joining marks would block the event loop for
 *  seconds (text-rules hand-off), so past a few megabytes code points stand in. It's only shown in the file's info. */
function characterCount(text: string): number {
  if (text.length <= 1_000_000) return graphemeCount(text);
  let count = 0;
  for (let at = 0; at < text.length; at++) {
    const unit = text.charCodeAt(at);
    if (unit >= 0xdc00 && unit <= 0xdfff) continue; // second half of a pair
    if (unit === 0x0a && at > 0 && text.charCodeAt(at - 1) === 0x0d) continue; // "\r\n" is one Character
    count++;
  }
  return count;
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Gives the event loop a turn: indexing runs in the daemon, which answers status, search and Pause meanwhile. */
const yieldToLoop = () => new Promise<void>((done) => setImmediate(done));

/** Rows a sync writes per transaction before it yields (about a tenth of a second of SQLite). */
const SYNC_SLICE = 2000;

/** A copy of a short string that doesn't keep the text it was cut from alive (V8 slices point into their parent). */
const detached = (text: string) => (" " + text).slice(1);

export class Indexer {
  readonly store: Store;
  readonly options: IndexOptions;
  private readonly helper: IndexerHelper;
  private readonly makeEmbedder: () => Promise<Embedder>;
  private readonly scratch: string;
  private readonly costsFolder: string | null;
  private readonly vectorSource: string;
  private readonly onReset: ((indexed: string, now: string) => void) | null;
  private readonly home: string;
  private readonly git: string | null | undefined;
  private readonly log: Log | null;
  private worker: Embedder | null = null;
  private measured = new MeasuredCosts();
  private jobsPrepared = 0;
  /** Folder → whether it's a repo or code project, for the code titles of one sync's files. */
  private repos = new Map<string, boolean>();
  /** The chunks of the last long document read: its later steps (40 chunks each) don't read and cut it again. */
  private lastDoc: { key: string; all: string[]; characters: number } | null = null;

  constructor(o: IndexerOptions) {
    this.store = o.store;
    this.options = o.options;
    this.helper = o.helper;
    this.makeEmbedder = o.embedder;
    this.scratch = o.scratch;
    this.costsFolder = o.costsFolder ?? null;
    this.vectorSource = o.vectorSource ?? VECTOR_SOURCE;
    this.onReset = o.onReset ?? null;
    this.home = o.home ?? homedir();
    this.git = o.git;
    this.log = o.log ?? null;
  }

  /** "<vector source> | <settings>": what the vectors of this index depend on. */
  get fingerprint(): string {
    return `${this.vectorSource} | ${optionsFingerprint(this.options)}`;
  }

  /** Whether the model was started for this indexer (since the last `closeWorker`). */
  get workerIsRunning(): boolean {
    return this.worker !== null;
  }

  /** Lets go of the embedder; the next file that needs it asks again. */
  closeWorker(): void {
    this.worker = null;
  }

  /** Lets go of the embedder and removes the scratch folder. */
  finish(): void {
    this.closeWorker();
    this.lastDoc = null;
    rmSync(this.scratch, { recursive: true, force: true });
  }

  // MARK: Sync

  /**
   * Crawls `roots` and reconciles the index: new files are queued, changed ones queued again, moved ones re-pathed (no
   * re-embedding), and files that are gone or newly excluded removed. A root that isn't there keeps its rows.
   */
  async sync(roots: readonly string[], crawled?: CrawlReport): Promise<SyncSummary> {
    const report =
      crawled ?? (await crawl(roots, this.options, { helper: this.helper, home: this.home, git: this.git }));
    this.repos = new Map();
    const rootPaths = roots.map(standardized);
    const existing = this.store.files(rootPaths);
    const byPath = new Map<string, FileRecord>();
    const byInode = new Map<string, FileRecord>();
    for (const file of existing) {
      byPath.set(file.path, file);
      byInode.set(`${file.device}:${file.inode}`, file);
    }
    const seen = new Set(report.candidates.map((file) => file.path));
    const movedFrom = new Set<string>();
    const summary: SyncSummary = {
      added: 0,
      changed: 0,
      moved: 0,
      removed: 0,
      unchanged: 0,
      crawl: report,
      queued: [],
    };
    // In slices of a few thousand rows, each its own transaction, with a turn of the event loop between them: a first
    // sync of 100,000 files is seconds of writing. What's gone is removed only once everything found is in.
    for (let start = 0; start < report.candidates.length; start += SYNC_SLICE) {
      if (start > 0) await yieldToLoop();
      const slice = report.candidates.slice(start, start + SYNC_SLICE);
      this.store.transaction(() => this.syncSlice(slice, byPath, byInode, seen, movedFrom, summary));
    }
    // A root that went away while it was walked (a drive ejected) looked emptier than it is: keep its rows.
    const vanished = rootPaths
      .filter((root) => !existsSync(root))
      .map((root) => (root.endsWith("/") ? root : root + "/"));
    const incomplete = report.failedPaths ?? [];
    const gone = existing.filter(
      (row) =>
        !seen.has(row.path) &&
        !movedFrom.has(row.path) &&
        !vanished.some((prefix) => row.path.startsWith(prefix)) &&
        !incomplete.some((path) => row.path === path || row.path.startsWith(path.endsWith("/") ? path : path + "/")),
    );
    for (let start = 0; start < gone.length; start += SYNC_SLICE) {
      if (start > 0 || report.candidates.length > 0) await yieldToLoop();
      this.store.transaction(() => {
        for (const row of gone.slice(start, start + SYNC_SLICE)) this.store.delete(row.id);
      });
      summary.removed += Math.min(SYNC_SLICE, gone.length - start);
    }
    return summary;
  }

  /** One slice of a sync's files: new ones queued, changed ones queued again, moved ones re-pathed. */
  private syncSlice(
    files: CrawlReport["candidates"],
    byPath: Map<string, FileRecord>,
    byInode: Map<string, FileRecord>,
    seen: Set<string>,
    movedFrom: Set<string>,
    summary: SyncSummary,
  ): void {
    for (const file of files) {
      const row = byPath.get(file.path);
      if (row) {
        if (row.size !== file.size || Math.abs(row.mtime - file.mtime) > 0.001 || row.kind !== file.kind) {
          this.store.requeue(row.id, file);
          summary.changed++;
          summary.queued.push(row.id);
        } else {
          summary.unchanged++;
        }
        continue;
      }
      const moved = byInode.get(`${file.device}:${file.inode}`);
      if (
        moved &&
        !seen.has(moved.path) &&
        !movedFrom.has(moved.path) &&
        moved.size === file.size &&
        Math.abs(moved.mtime - file.mtime) < 0.001
      ) {
        // Screenshot tools move screenshots into project folders all the time: only the path changes.
        this.store.move(moved.id, file.path);
        movedFrom.add(moved.path);
        summary.moved++;
      } else {
        summary.queued.push(this.store.insert(file));
        summary.added++;
      }
    }
  }

  // MARK: Run

  /**
   * Reads and embeds pending files (`only`: just these), screenshots first, newest first. Long PDFs and documents get
   * their first step and stay `partial` for `finishLongFiles`. A file's own problem is recorded on it; a dead embedder,
   * a helper that can't run or a settings mismatch ends the run (pending files stay pending). `shouldStop` is asked
   * between jobs.
   */
  async run(
    o: {
      limit?: number | null;
      only?: Iterable<number> | null;
      shouldStop?: () => boolean;
      onEvent?: (event: IndexEvent) => void;
      /** A job is about to be embedded and written: its first file. */
      onStart?: (file: FileRecord) => void;
    } = {},
  ): Promise<Partial<Record<FileState, number>>> {
    const queue = this.store.pending(o.limit ?? null, o.only ?? null);
    const states: Partial<Record<FileState, number>> = {};
    let done = 0;
    const jobs = Indexer.batches(queue).map((files): Job => ({ files, step: null }));
    await this.process(
      jobs,
      o.shouldStop ?? (() => false),
      (_index, job, results, seconds) => {
        job.files.forEach((file, offset) => {
          const [state, note] = results[offset];
          states[state] = (states[state] ?? 0) + 1;
          o.onEvent?.({
            done: done + offset + 1,
            total: queue.length,
            path: file.path,
            kind: file.kind,
            state,
            seconds,
            note,
          });
        });
        done += job.files.length;
      },
      undefined,
      o.onStart,
    );
    return states;
  }

  /**
   * The later pass: the rest of long PDFs and documents, in indexing order, a step at a time (30 pages, 40 chunks). Each
   * step is one transaction, so stopping between steps loses nothing.
   */
  async finishLongFiles(
    o: { shouldStop?: () => boolean; onStep?: (step: StepEvent) => void; onStart?: (file: FileRecord) => void } = {},
  ): Promise<Partial<Record<FileState, number>>> {
    const jobs: Job[] = [];
    for (const file of this.store.unfinished()) {
      const info = this.store.info(file.id);
      const size = file.kind === "pdf" ? this.options.pdfStep : this.options.docStep;
      // Where it stopped (after the last page or chunk stored, should its info not say; nothing stored: the start).
      let start = intOf(info.read_to) ?? this.store.lastPlace(file.id) ?? 0;
      // At least one step, which settles a file whose length was only guessed.
      const end = Math.max(intOf(info.read_end) ?? 0, start + 1);
      for (; start < end; start += size)
        jobs.push({ files: [file], step: { from: start, to: Math.min(start + size, end) } });
    }
    const through: number[] = [];
    for (const job of jobs) through.push((through[through.length - 1] ?? 0) + (job.step!.to - job.step!.from));
    let files = new Set(jobs.map((job) => job.files[0].id)).size;
    const states: Partial<Record<FileState, number>> = {};
    const finished = new Set<number>();
    await this.process(
      jobs,
      o.shouldStop ?? (() => false),
      (index, job, results, seconds) => {
        const file = job.files[0];
        const [state, note] = results[0];
        if (state !== "partial" && !finished.has(file.id)) {
          finished.add(file.id);
          states[state] = (states[state] ?? 0) + 1;
          files--;
        }
        o.onStep?.({
          done: through[index],
          total: through[through.length - 1] ?? 0,
          files,
          path: file.path,
          kind: file.kind,
          state,
          seconds,
          note,
        });
      },
      // Finished sooner than its steps said: a document whose length was guessed, or a file that went unreadable.
      (job) => finished.has(job.files[0].id),
      o.onStart,
    );
    return states;
  }

  /** Images and screenshots go to the model 8 at a time (consecutive files of one kind); other files one by one. */
  static batches(queue: readonly FileRecord[]): FileRecord[][] {
    const batches: FileRecord[][] = [];
    for (let index = 0; index < queue.length;) {
      const batch = [queue[index]];
      if (batch[0].kind === "image" || batch[0].kind === "screenshot") {
        while (
          index + batch.length < queue.length &&
          batch.length < 8 &&
          queue[index + batch.length].kind === batch[0].kind
        ) {
          batch.push(queue[index + batch.length]);
        }
      }
      batches.push(batch);
      index += batch.length;
    }
    return batches;
  }

  /**
   * Runs `jobs` in order until `shouldStop` (asked between jobs). While the model embeds one job, the next is read: the
   * helper and llama-server are separate processes. Each job's scratch folder goes when it's through, and a job read
   * for a run that stopped early is thrown away.
   */
  private async process(
    jobs: Job[],
    shouldStop: () => boolean,
    committed: (index: number, job: Job, results: Result[], seconds: number) => void,
    skip: (job: Job) => boolean = () => false,
    onStart?: (file: FileRecord) => void,
  ): Promise<void> {
    let ahead: Promise<Prepared> | null = null;
    let yielded = performance.now();
    try {
      for (let index = 0; index < jobs.length; index++) {
        // Jobs that need neither the helper nor the model (a skipped file, a numbers dump) run without a turn of the
        // event loop: the daemon would hear no status, search or Pause until the run ended.
        if (performance.now() - yielded > 50) {
          await yieldToLoop();
          yielded = performance.now();
        }
        if (shouldStop()) break;
        const job = jobs[index];
        const started = performance.now();
        const prepared = await (ahead ?? this.prepare(job));
        ahead = index + 1 < jobs.length ? this.prepare(jobs[index + 1]) : null;
        try {
          if (prepared.fatal) throw prepared.fatal;
          if (skip(job)) continue;
          onStart?.(job.files[0]);
          const modelWasRunning = this.worker !== null;
          const results = await this.commit(prepared);
          const seconds = (performance.now() - started) / 1000;
          if (modelWasRunning) this.measure(prepared, seconds); // else it's seconds of the model starting
          committed(index, job, results, seconds / job.files.length);
        } finally {
          rmSync(prepared.folder, { recursive: true, force: true });
        }
      }
    } finally {
      if (ahead) {
        const left = await ahead;
        rmSync(left.folder, { recursive: true, force: true });
      }
      if (this.costsFolder && this.measured.hasTallies) {
        MeasuredCosts.merge(this.measured, this.costsFolder);
        this.measured = new MeasuredCosts();
      }
    }
  }

  /** What a job read and how long it took (reading and embedding overlap), for estimates. */
  private measure(prepared: Prepared, seconds: number): void {
    const payload = prepared.payload;
    switch (payload.kind) {
      case "images":
        this.measured.add(payload.screenshot ? "screenshot" : "image", payload.ready.length, seconds);
        break;
      case "pdf":
        this.measured.add("pdfPage", payload.pages.length, seconds);
        break;
      case "doc": {
        // Chunks with a vector: a data dump's go to keyword search only and take next to nothing.
        const worded = payload.chunks.filter(hasWords).length;
        if (worded > 0) this.measured.add("docChunk", worded, seconds);
        break;
      }
      case "audio":
        this.measured.add("audioSecond", payload.duration, seconds);
        break;
      case "video":
        this.measured.add("videoSecond", payload.duration, seconds);
        break;
      case "code":
        this.measured.add("codeStretch", payload.file.pieces.length, seconds);
        break;
    }
  }

  // MARK: Model

  /** Compares the index with the current model and settings, without starting the model; a change empties the index
   *  (`onReset`) or throws `IndexerError`. */
  checkModel(): void {
    this.adopt(this.fingerprint);
  }

  private adopt(fingerprint: string): void {
    const indexed = this.store.meta("fingerprint");
    if (indexed === null || indexed === fingerprint) return;
    if (!this.onReset) throw new IndexerError(indexed, fingerprint);
    // Everything is queued again: a run under way goes on with its job, later runs take the rest.
    this.store.resetAll();
    this.onReset(indexed, fingerprint);
  }

  private async fullWorker(): Promise<Embedder> {
    if (this.worker) return this.worker;
    const started = await this.makeEmbedder();
    this.adopt(this.fingerprint);
    this.store.setModel(this.fingerprint, this.vectorSource);
    this.worker = started;
    return started;
  }

  // MARK: Prepare (files only: no database, no model)

  private prepare(job: Job): Promise<Prepared> {
    const folder = join(this.scratch, `batch-${++this.jobsPrepared}`);
    return this.read(job, folder);
  }

  private async read(job: Job, folder: string): Promise<Prepared> {
    const batch = job.files;
    const prepared: Prepared = {
      batch,
      step: job.step,
      folder,
      outcomes: new Map(),
      payload: { kind: "nothing" },
      fatal: null,
    };
    const settle = (error: unknown) => {
      if (error instanceof HelperError && FATAL_HELPER.has(error.kind)) {
        prepared.fatal = error;
        return;
      }
      if (error instanceof ExtractError && error.kind === "leftOut") {
        prepared.outcomes.set(0, { state: "skipped", detail: error.message });
        return;
      }
      for (let slot = 0; slot < batch.length; slot++) {
        if (!prepared.outcomes.has(slot)) prepared.outcomes.set(slot, failure(error));
      }
    };
    try {
      mkdirSync(folder, { recursive: true });
      const file = batch[0];
      const options = this.options;
      switch (file.kind) {
        case "image":
        case "screenshot": {
          const screenshot = file.kind === "screenshot";
          const ready: ReadyImage[] = [];
          for (const [slot, item] of batch.entries()) {
            try {
              const image = await this.helper.image({
                path: item.path,
                screenshot,
                budget: screenshot ? options.screenshotBudget : options.photoBudget,
                out: join(folder, `${slot}.png`),
                ocr: screenshot,
                minSide: options.minImageSide,
              });
              if (image.tooSmall) {
                prepared.outcomes.set(slot, { state: "skipped", detail: `small image ${image.width}×${image.height}` });
                continue;
              }
              ready.push({
                slot,
                path: join(folder, `${slot}.png`),
                width: image.width,
                height: image.height,
                taken: image.taken,
                ocr: image.ocr ?? "",
              });
            } catch (error) {
              if (error instanceof HelperError && FATAL_HELPER.has(error.kind)) throw error;
              prepared.outcomes.set(slot, failure(error));
            }
          }
          prepared.payload = { kind: "images", screenshot, ready };
          break;
        }
        case "pdf":
          prepared.payload = await this.readPdf(file, job.step, folder);
          break;
        case "doc": {
          // The chunks are cut the same way every time, so a later step goes on where the last one stopped.
          const { all, characters } = await this.docChunks(file);
          const want = job.step ?? { from: 0, to: options.docStep };
          const end = Math.min(all.length, options.maxChunks);
          const read = { from: Math.min(want.from, end), to: Math.min(Math.max(want.to, want.from), end) };
          prepared.payload = {
            kind: "doc",
            chunks: all.slice(read.from, read.to),
            read,
            total: all.length,
            characters,
          };
          break;
        }
        case "audio": {
          const audio = await this.helper.audio({
            path: file.path,
            outDir: folder,
            window: options.audioWindow,
            hop: options.audioHop,
            minimum: 2,
          });
          prepared.payload = { kind: "audio", pieces: audio.pieces, duration: audio.duration };
          break;
        }
        case "video": {
          const video = await this.helper.video({
            path: file.path,
            outDir: folder,
            interval: options.frameInterval,
            maxPixel: 1024,
            budget: options.frameBudget,
            window: options.audioWindow,
            hop: options.audioHop,
            minimum: 2,
          });
          prepared.payload = { kind: "video", frames: video.frames, sound: video.pieces, duration: video.duration };
          break;
        }
        case "code":
          prepared.payload = { kind: "code", file: readCode(file.path, options, this.home, this.repos) };
          break;
      }
    } catch (error) {
      settle(error);
      prepared.payload = { kind: "nothing" };
    }
    return prepared;
  }

  /**
   * The pages a job reads: a long PDF's first 30 (or a step of the later pass), a short one's all. The page count comes
   * with the first read, so a PDF of 31-50 pages takes a second call for the rest.
   */
  private async readPdf(file: FileRecord, step: Job["step"], folder: string): Promise<Payload> {
    const options = this.options;
    const ask = (from: number, to: number) =>
      this.helper.pdf({
        path: file.path,
        from,
        to,
        minText: options.minPageText,
        renderPixels: 1400,
        budget: options.pageBudget,
        outDir: folder,
      });
    const first = step
      ? await ask(step.from, Math.min(step.to, options.maxPages))
      : await ask(0, Math.min(options.pdfStep, options.maxPages));
    if (first.locked) throw ExtractError.locked();
    const total = first.pages;
    const limit = Math.min(total, options.maxPages);
    let wanted =
      step ?? (total > options.bigPDFPages ? { from: 0, to: options.pdfStep } : { from: 0, to: options.maxPages });
    wanted = { from: Math.min(wanted.from, limit), to: Math.min(Math.max(wanted.to, wanted.from), limit) };
    let pages = first.items;
    // A short PDF longer than the first call's pages: read the rest of it too.
    const readTo = step ? Math.min(step.to, options.maxPages) : Math.min(options.pdfStep, options.maxPages);
    if (wanted.to > readTo) {
      const rest = await ask(readTo, wanted.to);
      pages = pages.concat(rest.items);
    }
    pages = pages.filter((page) => page.number - 1 >= wanted.from && page.number - 1 < wanted.to);
    return { kind: "pdf", pages, read: wanted, total, title: first.title ?? null };
  }

  /** DigUp: DocExtractor.text. Word processor files through the Cocoa text system (the helper), HTML stripped here. */
  private async docText(path: string): Promise<string> {
    const ext = lowercased(pathExtension(lastPathComponent(path)));
    switch (ext) {
      case "docx":
      case "doc":
      case "odt":
      case "rtf":
        return (await this.helper.rich(path, ext)).text;
      case "html":
      case "htm": {
        const html = await readTextFile(path);
        await yieldToLoop();
        return plainTextFromHTML(html);
      }
      default:
        return readTextFile(path);
    }
  }

  /**
   * A document's chunks (up to maxChunks + 1) and its length in Characters, with turns of the event loop between the
   * read, the cut and the count. A long document's are kept for its later steps, which would otherwise read and cut a
   * file of hundreds of megabytes once per 40 chunks. Keyed by what the sync saw, so a later step reads what the first
   * one did.
   */
  private async docChunks(file: FileRecord): Promise<{ all: string[]; characters: number }> {
    const key = `${file.id}|${file.size}|${file.mtime}`;
    if (this.lastDoc?.key === key) return this.lastDoc;
    const text = await this.docText(file.path);
    await yieldToLoop();
    const all = cutChunks(text, this.options.maxChunks + 1);
    await yieldToLoop();
    const characters = characterCount(text);
    if (all.length <= this.options.docStep) return { all, characters };
    this.lastDoc = { key, all: all.map(detached), characters };
    return this.lastDoc;
  }

  // MARK: Commit (the model and the database)

  private async commit(prepared: Prepared): Promise<Result[]> {
    const batch = prepared.batch;
    const later = prepared.step !== null;
    const step = prepared.step;
    if (step && prepared.outcomes.has(0)) {
      const outcome = prepared.outcomes.get(0)!;
      return [this.stopReading(batch[0], step.from, outcome.detail ?? outcome.state, outcome)];
    }
    const results: Result[] = batch.map(() => ["failed", null]);
    for (const [slot, outcome] of prepared.outcomes) {
      this.store.finish(batch[slot].id, outcome.state, outcome.detail);
      results[slot] = [outcome.state, outcome.detail];
    }
    const payload = prepared.payload;
    try {
      switch (payload.kind) {
        case "nothing":
          break;
        case "images":
          await this.images(batch, payload.screenshot, payload.ready, results);
          break;
        case "pdf":
          results[0] = await this.pdf(batch[0], payload, later);
          break;
        case "doc":
          results[0] = await this.doc(batch[0], payload, later);
          break;
        case "audio":
          results[0] = await this.audio(batch[0], payload.pieces, payload.duration);
          break;
        case "video":
          results[0] = await this.video(batch[0], payload.frames, payload.sound, payload.duration);
          break;
        case "code":
          results[0] = await this.code(batch[0], payload.file);
          break;
      }
    } catch (error) {
      // The model or the settings: the run ends, and nothing of this job is recorded.
      if (error instanceof IndexerError || error instanceof EmbedderFailure) throw error;
      if (step) return [this.stopReading(batch[0], step.from, messageOf(error))];
      batch.forEach((file, slot) => {
        if (prepared.outcomes.has(slot)) return;
        this.store.finish(file.id, "failed", messageOf(error));
        results[slot] = ["failed", messageOf(error)];
      });
    }
    return results;
  }

  /** Vectors from the model; a failure there ends the run (the server is gone or broken), not just this file. */
  private async embed<T>(work: (worker: Embedder) => Promise<T>): Promise<T> {
    const worker = await this.fullWorker();
    try {
      return await work(worker);
    } catch (error) {
      this.closeWorker();
      this.log?.warn(`indexer: the embedder failed: ${messageOf(error)}`);
      throw new EmbedderFailure(messageOf(error));
    }
  }

  /**
   * A long file that can't be read any further keeps the pages or chunks read so far (they stay searchable) and counts
   * as done, rather than failed or tried again and again. A watchdog stop says so as DigUp's does.
   */
  private stopReading(file: FileRecord, place: number, problem: string, outcome?: Outcome): Result {
    const info = this.store.info(file.id);
    delete info.read_to;
    delete info.read_end;
    const unit = file.kind === "pdf" ? "page" : "chunk";
    if (outcome?.detail?.startsWith("It ")) {
      const why = outcome.detail.slice(3);
      this.store.finish(file.id, "done", `The rest couldn't be read: it ${why}`, info);
      return ["done", `stopped before ${unit} ${place + 1}: it ${why}`];
    }
    this.store.finish(file.id, "done", `read to ${unit} ${place}, not after: ${problem}`, info);
    return ["done", `stopped before ${unit} ${place + 1}: ${problem}`];
  }

  private async images(
    batch: FileRecord[],
    screenshot: boolean,
    ready: ReadyImage[],
    results: Result[],
  ): Promise<void> {
    if (ready.length === 0) return;
    const vectors = await this.embed((worker) => worker.embedImages(ready.map((item) => item.path)));
    this.store.transaction(() => {
      ready.forEach((item, position) => {
        const file = batch[item.slot];
        const vector = vectors[position];
        if (vector instanceof Error) {
          this.store.finish(file.id, "failed", vector.message);
          results[item.slot] = ["failed", vector.message];
          return;
        }
        this.store.addSegment({ file: file.id, kind: "image", modality: "image", vector });
        // The words on screen are for keyword search: codes, names and errors typed exactly. Meaning comes from the
        // picture alone; a vector of the words made screenshots outrank better matches (DigUp, 2026-10-08).
        if (item.ocr !== "") {
          this.store.addSegment({
            file: file.id,
            kind: "ocr",
            modality: "text",
            excerpt: excerpt(item.ocr),
            text: item.ocr,
          });
        }
        const info: Record<string, string> = { width: `${item.width}`, height: `${item.height}` };
        if (item.taken) info.taken = item.taken;
        const characters = graphemeCount(item.ocr);
        if (screenshot) info.ocr_chars = `${characters}`;
        this.store.finish(file.id, "done", null, info);
        results[item.slot] = ["done", screenshot ? `ocr ${characters} chars` : null];
      });
    });
  }

  /** Pages `read` of a PDF (all of a short one, a step of a long one). A long one stays `partial` with `read_to` and
   *  `read_end` (pages, from 0) in its info until its last step. */
  private async pdf(file: FileRecord, payload: Extract<Payload, { kind: "pdf" }>, later: boolean): Promise<Result> {
    const { pages, read, total } = payload;
    const end = Math.min(total, this.options.maxPages);
    const unread = read.to < end;
    if (pages.length === 0 && !later && !unread) {
      this.store.finish(file.id, "skipped", "no pages");
      return ["skipped", "no pages"];
    }
    const title = payload.title ?? titleOf(file.path);
    const textPages = pages.filter((page) => !page.image);
    // A page that's mostly digits (a table, a data listing) gets keyword search only.
    const wordPages = textPages.filter((page) => hasWords(page.text));
    const imagePages = pages.filter((page) => page.image);
    const garbledPages = pages.filter((page) => page.garbled !== undefined && page.garbled !== null);
    let textVectors = new Map<number, Float32Array>();
    let imageVectors: Array<Float32Array | Error> = [];
    let garbledVectors: Float32Array[] = [];
    if (wordPages.length > 0 || imagePages.length > 0) {
      await this.embed(async (worker) => {
        const vectors = await worker.embedTexts(
          wordPages.map((page) => Prompts.document(title, graphemePrefix(page.text, 4000))),
        );
        textVectors = new Map(wordPages.map((page, at) => [page.number, vectors[at]]));
        imageVectors = await worker.embedImages(imagePages.map((page) => page.image!));
        garbledVectors = await worker.embedTexts(
          garbledPages.map((page) => Prompts.document(title, graphemePrefix(page.garbled!, 4000))),
        );
      });
    }
    this.store.transaction(() => {
      // Meaning only: the garbled words are never shown or matched against what you type.
      garbledPages.forEach((page, at) => {
        this.store.addSegment({
          file: file.id,
          kind: "page",
          modality: "text",
          loc: page.number,
          vector: garbledVectors[at],
        });
      });
      for (const page of textPages) {
        this.store.addSegment({
          file: file.id,
          kind: "page",
          modality: "text",
          loc: page.number,
          excerpt: excerpt(page.text),
          text: page.text,
          vector: textVectors.get(page.number) ?? null,
        });
      }
      imagePages.forEach((page, at) => {
        const vector = imageVectors[at];
        this.store.addSegment({
          file: file.id,
          kind: "page_image",
          modality: "image",
          loc: page.number,
          excerpt: page.text === "" ? null : excerpt(page.text),
          text: page.text,
          vector: vector instanceof Error ? null : vector,
        });
      });
      const info = later ? this.store.info(file.id) : {};
      info.pages = `${total}`;
      info.scanned_pages = `${(intOf(info.scanned_pages) ?? 0) + imagePages.length}`;
      if (unread) {
        info.read_to = `${read.to}`;
        info.read_end = `${end}`;
      } else {
        delete info.read_to;
        delete info.read_end;
      }
      const detail = unread
        ? `read to page ${read.to} of ${total}`
        : end < total
          ? `the first ${end} of ${total} pages`
          : null;
      this.store.finish(file.id, unread ? "partial" : "done", detail, info);
    });
    const ocr = pages.filter((page) => page.ocr).length;
    const span = later ? `pages ${read.from + 1}–${read.to} of ${total}` : `${pages.length}/${total} pages`;
    return [
      unread ? "partial" : "done",
      `${span}, ${imagePages.length} as images` + (ocr > 0 ? `, ${ocr} read by OCR` : ""),
    ];
  }

  /** Chunks `read` of a document (all of a short one, a step of a long one), the way `pdf` reads pages. */
  private async doc(file: FileRecord, payload: Extract<Payload, { kind: "doc" }>, later: boolean): Promise<Result> {
    const { chunks, read, total, characters } = payload;
    if (total === 0) {
      this.store.finish(file.id, "skipped", "no text");
      return ["skipped", "no text"];
    }
    const title = titleOf(file.path);
    // Text that's mostly digits (a data dump saved as .txt) gets keyword search only.
    const worded = chunks.flatMap((chunk, at) => (hasWords(chunk) ? [at] : []));
    const vectors =
      worded.length === 0
        ? []
        : await this.embed((worker) => worker.embedTexts(worded.map((at) => Prompts.document(title, chunks[at]))));
    const vector = new Map(worded.map((at, position) => [at, vectors[position]]));
    const end = Math.min(total, this.options.maxChunks);
    const unread = read.to < end;
    this.store.transaction(() => {
      chunks.forEach((chunk, offset) => {
        this.store.addSegment({
          file: file.id,
          kind: "chunk",
          modality: "text",
          loc: read.from + offset + 1,
          excerpt: excerpt(chunk),
          text: chunk,
          vector: vector.get(offset) ?? null,
        });
      });
      const info: Record<string, string> = { chunks: `${end}`, chars: `${characters}` };
      if (unread) {
        info.read_to = `${read.to}`;
        info.read_end = `${end}`;
      }
      const detail = unread ? `read to chunk ${read.to} of ${end}` : end < total ? `the first ${end} chunks` : null;
      this.store.finish(file.id, unread ? "partial" : "done", detail, info);
    });
    const span = later
      ? `chunks ${read.from + 1}–${read.to} of ${end}`
      : unread
        ? `${chunks.length} of ${end} chunks`
        : `${chunks.length} chunks`;
    return [
      unread ? "partial" : "done",
      span + (worded.length < chunks.length ? `, ${chunks.length - worded.length} for keywords only` : ""),
    ];
  }

  /** A code file's stretches of lines (a notebook's of cells), each embedded with the file's path in its repo as its
   *  title, and kept with its lines for keyword search and for opening at the place. */
  private async code(file: FileRecord, code: CodeFile): Promise<Result> {
    if (code.pieces.length === 0) {
      this.store.finish(file.id, "skipped", "no code");
      return ["skipped", "no code"];
    }
    // Lines that are mostly numbers and symbols (a table of constants) get keyword search only.
    const worded = code.pieces.flatMap((piece, at) => (hasWords(piece.text) ? [at] : []));
    const vectors =
      worded.length === 0
        ? []
        : await this.embed((worker) =>
            worker.embedTexts(worded.map((at) => Prompts.document(code.title, code.pieces[at].text))),
          );
    const vector = new Map(worded.map((at, position) => [at, vectors[position]]));
    this.store.transaction(() => {
      code.pieces.forEach((piece, offset) => {
        this.store.addSegment({
          file: file.id,
          kind: code.cells === null ? "lines" : "cells",
          modality: "text",
          loc: piece.first,
          locEnd: piece.last,
          excerpt: summary(piece.text),
          text: piece.text,
          vector: vector.get(offset) ?? null,
        });
      });
      const info: Record<string, string> = { lines: `${code.lines}` };
      if (code.cells !== null) info.cells = `${code.cells}`;
      if (code.repo !== null) info.repo = code.repo;
      this.store.finish(file.id, "done", null, info);
    });
    const size = code.cells !== null ? `${code.cells} cells` : `${code.lines} lines`;
    return [
      "done",
      `${code.pieces.length} stretches, ${size}` +
        (worded.length < code.pieces.length ? `, ${code.pieces.length - worded.length} for keywords only` : ""),
    ];
  }

  private async audio(file: FileRecord, pieces: MediaPiece[], duration: number): Promise<Result> {
    if (pieces.length === 0) {
      this.store.finish(file.id, "skipped", "silent or shorter than 2 s");
      return ["skipped", "silent or too short"];
    }
    const vectors = await this.embed((worker) => worker.embedAudio(pieces.map((piece) => piece.path)));
    this.store.transaction(() => {
      pieces.forEach((piece, at) => {
        const vector = vectors[at];
        if (vector instanceof Error) return; // a window the model couldn't read adds nothing
        this.store.addSegment({
          file: file.id,
          kind: "audio",
          modality: "audio",
          loc: piece.start,
          locEnd: piece.end,
          vector,
        });
      });
      this.store.finish(file.id, "done", null, { duration: duration.toFixed(1) });
    });
    return ["done", `${pieces.length} windows, ${Math.trunc(duration)} s`];
  }

  private async video(file: FileRecord, frames: MediaPiece[], sound: MediaPiece[], duration: number): Promise<Result> {
    if (frames.length === 0 && sound.length === 0) {
      this.store.finish(file.id, "skipped", "no frames or sound");
      return ["skipped", "no frames or sound"];
    }
    const [frameVectors, soundVectors] = await this.embed(async (worker) => [
      await worker.embedImages(frames.map((frame) => frame.path)),
      await worker.embedAudio(sound.map((piece) => piece.path)),
    ]);
    this.store.transaction(() => {
      frames.forEach((frame, at) => {
        const vector = frameVectors[at];
        if (vector instanceof Error) return;
        this.store.addSegment({
          file: file.id,
          kind: "frame",
          modality: "image",
          loc: frame.start,
          locEnd: frame.end,
          vector,
        });
      });
      sound.forEach((piece, at) => {
        const vector = soundVectors[at];
        if (vector instanceof Error) return;
        this.store.addSegment({
          file: file.id,
          kind: "audio",
          modality: "audio",
          loc: piece.start,
          locEnd: piece.end,
          vector,
        });
      });
      this.store.finish(file.id, "done", null, {
        duration: duration.toFixed(1),
        frames: `${frames.length}`,
        sound_windows: `${sound.length}`,
      });
    });
    return ["done", `${frames.length} frames, ${sound.length} sound windows, ${Math.trunc(duration)} s`];
  }
}

/** The embedder failed (its server is gone or broken): the run stops and the job's files stay pending. */
export class EmbedderFailure extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmbedderFailure";
  }
}

/** A file's own problem: DigUp's wording, and its watchdog's ("It took more than 15 minutes to read"). */
function failure(error: unknown): Outcome {
  if (error instanceof HelperError) {
    if (error.kind === "timeout" || error.kind === "memory") return { state: "failed", detail: `It ${error.message}` };
    if (error.kind === "crashed")
      return { state: "failed", detail: `unreadable: the reader crashed (${error.message})` };
    return { state: "failed", detail: error.message };
  }
  if (error instanceof ExtractError)
    return { state: error.kind === "tooSmall" ? "skipped" : "failed", detail: error.message };
  const code = (error as { code?: string } | null)?.code;
  if (code === "ENOENT") return { state: "failed", detail: "unreadable: the file is gone" };
  if (code === "EACCES" || code === "EPERM") return { state: "failed", detail: "unreadable: no permission to read it" };
  return { state: "failed", detail: messageOf(error) };
}

/** The title a document or PDF is embedded with: its name without the extension, in the form DigUp reads it in
 *  (`URL(fileURLWithPath:)`, decomposed), so an accented name gives DigUp's vectors. */
export function titleOf(path: string): string {
  return fileSystemForm(deletingPathExtension(lastPathComponent(path)));
}

function intOf(value: string | undefined): number | null {
  if (value === undefined || !/^-?\d+$/.test(value)) return null;
  return Number(value);
}
