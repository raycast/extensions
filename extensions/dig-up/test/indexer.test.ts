// The indexer (engine/indexer.ts): DigUp's IndexerTests and LongFilesTests behaviors. Sync runs the real helper's walk
// on temporary folders; reading runs on text files (read here) or on a fake helper, and embedding on a fake embedder.

import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { after, describe, it } from "node:test";
import type { Embedder } from "../engine/embedder";
import { Helper, HelperError, type ImageArgs, type ImageResult, type PdfArgs, type PdfResult } from "../engine/helper";
import { EmbedderFailure, Indexer, IndexerError, type IndexerHelper, type IndexEvent } from "../engine/indexer";
import { silentLog } from "../engine/log";
import { Store, type Candidate } from "../engine/store";
import { chunks } from "../engine/text";
import {
  DEFAULT_OPTIONS,
  DIMENSION,
  VECTOR_SOURCE,
  optionsFingerprint,
  type FileKind,
  type IndexOptions,
} from "../engine/types";

const repo = resolve(import.meta.dirname, "..");
const bin = join(repo, "assets/digup-helper");
const noHelper = existsSync(bin) ? false : `${bin} is missing: build it with scripts/build-helper.sh`;
const realHelper = new Helper(bin, silentLog);
after(() => realHelper.close());

const temps: string[] = [];
after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "dig-up-indexer-")));
  temps.push(dir);
  return dir;
}

function write(root: string, path: string, body: string): string {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
  return file;
}

/** A unit vector that depends on the input only. */
function unit(input: string): Float32Array {
  const vector = new Float32Array(DIMENSION);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  vector[Math.abs(hash) % DIMENSION] = 1;
  return vector;
}

class FakeEmbedder implements Embedder {
  texts: string[] = [];
  images: string[] = [];
  audio: string[] = [];
  failing = new Set<string>();
  broken = false;
  delayMs = 0;
  events: string[] = [];
  async embedTexts(texts: string[]): Promise<Float32Array[]> {
    if (this.broken) throw new Error("llama-server (index) exited with code 1");
    this.texts.push(...texts);
    return texts.map(unit);
  }
  async embedImages(paths: string[]): Promise<Array<Float32Array | Error>> {
    if (this.broken) throw new Error("llama-server (index) exited with code 1");
    this.events.push(`embed ${paths.map((p) => basename(p)).join(",")} start`);
    if (this.delayMs) await new Promise((done) => setTimeout(done, this.delayMs));
    this.events.push(`embed ${paths.map((p) => basename(p)).join(",")} end`);
    this.images.push(...paths);
    return paths.map((path) =>
      this.failing.has(basename(path)) ? new Error(`can't read ${basename(path)}`) : unit(path),
    );
  }
  async embedAudio(paths: string[]): Promise<Array<Float32Array | Error>> {
    this.audio.push(...paths);
    return paths.map(unit);
  }
}

/** A helper whose reading is made up: images by name, PDFs of `pages` pages (text pages of 300 letters). */
class FakeHelper implements IndexerHelper {
  pdfCalls: Array<[number, number]> = [];
  imageCalls: string[] = [];
  pages = 120;
  small = new Set<string>();
  timeouts = new Set<string>();
  events: string[] = [];
  delayMs = 0;
  walk = realHelper.walk.bind(realHelper);
  rich = realHelper.rich.bind(realHelper);
  audio = realHelper.audio.bind(realHelper);
  video = realHelper.video.bind(realHelper);

  async image(args: ImageArgs): Promise<ImageResult> {
    const name = basename(args.path);
    this.imageCalls.push(name);
    this.events.push(`read ${name}`);
    if (this.delayMs) await new Promise((done) => setTimeout(done, this.delayMs));
    if (this.timeouts.has(name)) throw new HelperError("took more than 15 minutes to read", "timeout", "image");
    if (this.small.has(name)) return { tooSmall: true, width: 32, height: 32 };
    writeFileSync(args.out, "png");
    return {
      width: 1440,
      height: 900,
      sized: { width: 448, height: 280 },
      ocr: args.ocr ? `words on ${name}` : undefined,
    };
  }

  async pdf(args: PdfArgs): Promise<PdfResult> {
    this.pdfCalls.push([args.from, args.to]);
    const name = basename(args.path);
    if (this.timeouts.has(name) && args.from > 0)
      throw new HelperError("took more than 15 minutes to read", "timeout", "pdf");
    const items = [];
    for (let page = args.from; page < Math.min(args.to, this.pages); page++) {
      items.push({ number: page + 1, text: `page ${page + 1} ` + "words about sailing ".repeat(15) });
    }
    return { pages: this.pages, title: "Sailing log", items };
  }
}

function setup(
  o: {
    options?: Partial<IndexOptions>;
    helper?: IndexerHelper;
    onReset?: ((a: string, b: string) => void) | null;
  } = {},
) {
  const dir = tempDir();
  const store = Store.open(join(dir, "index", "index.sqlite"), { code: false });
  after(() => store.close());
  const embedder = new FakeEmbedder();
  let started = 0;
  const scratch = join(dir, "scratch");
  const indexer = new Indexer({
    store,
    options: { ...DEFAULT_OPTIONS, ...o.options },
    helper: o.helper ?? realHelper,
    embedder: async () => {
      started++;
      return embedder;
    },
    scratch,
    costsFolder: join(dir, "index"),
    onReset: o.onReset === undefined ? () => {} : o.onReset,
  });
  return { dir, store, embedder, indexer, scratch, started: () => started };
}

function add(store: Store, path: string, kind: FileKind, mtime = 1): number {
  const candidate: Candidate = { path, kind, size: 10, mtime, inode: Math.floor(Math.random() * 1e9), device: 1 };
  return store.insert(candidate);
}

const state = (store: Store, path: string) => {
  const row = store.get("SELECT state, detail, info FROM files WHERE path = ?", path);
  return row
    ? { state: row.state, detail: row.detail, info: row.info === null ? null : JSON.parse(String(row.info)) }
    : null;
};

describe("sync", { skip: noHelper }, () => {
  it("adds new files, leaves unchanged ones, requeues changed ones, follows moves and drops deleted ones", async () => {
    const { dir, store, indexer, embedder } = setup();
    const root = join(dir, "docs");
    write(root, "a.txt", "notes about the trip to Japan");
    write(root, "b.txt", "a grocery list with milk and eggs");
    write(root, "c.txt", "meeting minutes from Thursday");
    let sync = await indexer.sync([root]);
    assert.deepEqual([sync.added, sync.changed, sync.moved, sync.removed, sync.unchanged], [3, 0, 0, 0, 0]);
    assert.equal(sync.queued.length, 3);
    await indexer.run();
    assert.equal(embedder.texts.length, 3);
    const b = store.fileAt(join(root, "b.txt"))!;

    sync = await indexer.sync([root]);
    assert.deepEqual([sync.added, sync.changed, sync.moved, sync.removed, sync.unchanged], [0, 0, 0, 0, 3]);
    assert.equal(sync.queued.length, 0);

    // Changed: segments go (the name stays) and it's read again from the start.
    write(root, "a.txt", "notes about the trip to Japan, and Kyoto too");
    // Moved: same inode, size and date at a new path: only the path changes.
    renameSync(join(root, "b.txt"), join(root, "groceries.txt"));
    // Deleted.
    rmSync(join(root, "c.txt"));
    sync = await indexer.sync([root]);
    assert.deepEqual([sync.added, sync.changed, sync.moved, sync.removed, sync.unchanged], [0, 1, 1, 1, 0]);
    assert.equal(state(store, join(root, "a.txt"))?.state, "pending");
    const moved = store.fileAt(join(root, "groceries.txt"))!;
    assert.equal(moved.id, b.id);
    assert.equal(moved.state, "done");
    assert.equal(store.fileAt(join(root, "c.txt")), null);
    const names = store.all(
      "SELECT fts.name FROM fts JOIN segments s ON s.id = fts.rowid WHERE s.file = ? AND s.kind = 'name'",
      b.id,
    );
    assert.equal(names[0].name, "groceries.txt");
    // Only the changed file is embedded again.
    const before = embedder.texts.length;
    await indexer.run();
    assert.equal(embedder.texts.length, before + 1);
  });

  it("keeps the files of a root that isn't there (an unplugged drive)", async () => {
    const { dir, store, indexer } = setup();
    const root = join(dir, "drive");
    write(root, "a.txt", "on the drive");
    await indexer.sync([root]);
    rmSync(root, { recursive: true });
    const sync = await indexer.sync([root]);
    assert.equal(sync.removed, 0);
    assert.ok(store.fileAt(join(root, "a.txt")));
  });

  it("requeues a file whose kind changed", async () => {
    const { dir, store, indexer } = setup();
    const root = join(dir, "pics");
    write(root, "x.png", "png");
    await indexer.sync([root]);
    store.run("UPDATE files SET kind = 'screenshot', state = 'done'");
    const sync = await indexer.sync([root]);
    assert.equal(sync.changed, 1);
    assert.equal(store.fileAt(join(root, "x.png"))?.kind, "image");
  });
});

describe("documents", { skip: noHelper }, () => {
  it("embeds a short document's chunks with the file name as title", async () => {
    const { dir, store, indexer, embedder } = setup();
    const root = join(dir, "docs");
    const file = write(root, "Tokyo itinerary.md", "Day trip to Kamakura to see the Great Buddha.");
    await indexer.sync([root]);
    const events: IndexEvent[] = [];
    const states = await indexer.run({ onEvent: (event) => events.push(event) });
    assert.deepEqual(states, { done: 1 });
    assert.deepEqual(embedder.texts, ["title: Tokyo itinerary | text: Day trip to Kamakura to see the Great Buddha."]);
    assert.equal(events[0].note, "1 chunks");
    assert.deepEqual(state(store, file), { state: "done", detail: null, info: { chars: "45", chunks: "1" } });
    const segment = store.get(
      "SELECT kind, modality, loc, excerpt FROM segments WHERE file = ? AND kind != 'name'",
      store.fileAt(file)!.id,
    );
    assert.deepEqual(
      { ...segment },
      { kind: "chunk", modality: "text", loc: 1, excerpt: "Day trip to Kamakura to see the Great Buddha." },
    );
  });

  it("titles a document with its name in DigUp's decomposed form (URL(fileURLWithPath:))", async () => {
    const { dir, indexer, embedder } = setup();
    const root = join(dir, "docs");
    write(root, "Smlouva o dílo - Ředitelství.txt".normalize("NFC"), "Smluvní strany se dohodly na díle.");
    await indexer.sync([root]);
    await indexer.run();
    assert.deepEqual(embedder.texts, [
      "title: Smlouva o di\u0301lo - R\u030ceditelstvi\u0301 | text: Smluvní strany se dohodly na díle.",
    ]);
  });

  it("keeps a numbers dump for keyword search only, and skips an empty file", async () => {
    const { dir, store, indexer, embedder } = setup();
    const root = join(dir, "docs");
    const rows = Array.from({ length: 30 }, (_, i) => `${4815162342 + i} 0 0`).join("\n");
    const dump = write(root, "sensor readings.txt", rows);
    const empty = write(root, "empty.txt", "   \n  ");
    await indexer.sync([root]);
    const events: IndexEvent[] = [];
    await indexer.run({ onEvent: (event) => events.push(event) });
    assert.equal(embedder.texts.length, 0);
    assert.equal(state(store, dump)?.state, "done");
    assert.equal(events.find((event) => event.path === dump)?.note, "1 chunks, 1 for keywords only");
    assert.deepEqual(state(store, empty), { state: "skipped", detail: "no text", info: null });
    assert.equal(Number(store.get("SELECT COUNT(*) AS n FROM fts WHERE fts MATCH '\"4815162342\"'")?.n), 1);
  });

  it("reads a long document's first 40 chunks, then the rest step by step (DigUp: LongFilesTests)", async () => {
    const { dir, store, indexer, embedder } = setup();
    const root = join(dir, "docs");
    const words = Array.from({ length: 30_000 }, (_, i) => `word${i % 97}`).join(" ");
    const file = write(root, "Team notes.md", words);
    const all = chunks(words, 5001);
    assert.ok(all.length > 80, `${all.length} chunks`);
    await indexer.sync([root]);
    const events: IndexEvent[] = [];
    await indexer.run({ onEvent: (event) => events.push(event) });
    assert.equal(events[0].state, "partial");
    assert.equal(events[0].note, `40 of ${all.length} chunks`);
    assert.deepEqual(state(store, file), {
      state: "partial",
      detail: `read to chunk 40 of ${all.length}`,
      info: { chars: `${words.length}`, chunks: `${all.length}`, read_end: `${all.length}`, read_to: "40" },
    });
    assert.deepEqual(store.unfinishedCount(), { files: 1, left: all.length - 40 });
    const steps: Array<[number, number, string]> = [];
    const finished = await indexer.finishLongFiles({
      onStep: (step) => steps.push([step.done, step.total, step.state]),
    });
    assert.deepEqual(finished, { done: 1 });
    assert.deepEqual(steps.at(-1), [all.length - 40, all.length - 40, "done"]);
    assert.equal(steps.length, Math.ceil((all.length - 40) / 40));
    assert.deepEqual(state(store, file), {
      state: "done",
      detail: null,
      info: { chars: `${words.length}`, chunks: `${all.length}` },
    });
    // What was stored step by step is what one pass would have stored.
    const stored = store
      .all(
        "SELECT s.loc, fts.body FROM segments s JOIN fts ON fts.rowid = s.id WHERE s.file = ? AND s.kind = 'chunk' ORDER BY s.loc",
        store.fileAt(file)!.id,
      )
      .map((row) => String(row.body));
    assert.deepEqual(stored, all);
    assert.equal(embedder.texts.length, all.length);
  });

  it("reads a long document once for all its steps", async () => {
    const { dir, store, indexer } = setup();
    const root = join(dir, "docs");
    const file = write(root, "long.md", Array.from({ length: 30_000 }, (_, i) => `word${i % 97}`).join(" "));
    await indexer.sync([root]);
    await indexer.run();
    // The later steps cut what the first step read: here the file is gone, and they're still read to the end.
    rmSync(file);
    assert.deepEqual(await indexer.finishLongFiles(), { done: 1 });
    assert.equal(state(store, file)?.detail, null);
  });

  it("a changed long file starts over from the first chunk", async () => {
    const { dir, store, indexer } = setup();
    const root = join(dir, "docs");
    const file = write(root, "long.md", Array.from({ length: 30_000 }, (_, i) => `w${i % 50}`).join(" "));
    await indexer.sync([root]);
    await indexer.run();
    assert.equal(state(store, file)?.state, "partial");
    write(root, "long.md", "short now");
    await indexer.sync([root]);
    assert.equal(state(store, file)?.state, "pending");
    assert.equal(Number(store.get("SELECT COUNT(*) AS n FROM segments WHERE kind = 'chunk'")?.n), 0);
    await indexer.run();
    assert.equal(state(store, file)?.state, "done");
  });
});

describe("PDFs", { skip: noHelper }, () => {
  it("reads 30 pages of a long PDF first, then steps of 30 (DigUp: LongFilesTests)", async () => {
    const helper = new FakeHelper();
    const { dir, store, indexer, embedder } = setup({ helper });
    const file = join(dir, "Sailing log 2025.pdf");
    add(store, file, "pdf");
    const events: IndexEvent[] = [];
    await indexer.run({ onEvent: (event) => events.push(event) });
    assert.deepEqual(helper.pdfCalls, [[0, 30]]);
    assert.equal(events[0].note, "30/120 pages, 0 as images");
    assert.deepEqual(state(store, file), {
      state: "partial",
      detail: "read to page 30 of 120",
      info: { pages: "120", read_end: "120", read_to: "30", scanned_pages: "0" },
    });
    assert.deepEqual(store.unfinishedCount(), { files: 1, left: 90 });
    assert.ok(embedder.texts[0].startsWith("title: Sailing log | text: page 1 words about sailing"));
    const steps: number[] = [];
    await indexer.finishLongFiles({ onStep: (step) => steps.push(step.done) });
    assert.deepEqual(steps, [30, 60, 90]);
    assert.deepEqual(helper.pdfCalls.slice(1), [
      [30, 60],
      [60, 90],
      [90, 120],
    ]);
    assert.deepEqual(state(store, file), { state: "done", detail: null, info: { pages: "120", scanned_pages: "0" } });
    assert.equal(Number(store.get("SELECT COUNT(*) AS n FROM segments WHERE kind = 'page'")?.n), 120);
  });

  it("reads a PDF of up to 50 pages whole, in two calls past 30", async () => {
    const helper = new FakeHelper();
    helper.pages = 42;
    const { dir, store, indexer } = setup({ helper });
    const file = join(dir, "report.pdf");
    add(store, file, "pdf");
    await indexer.run();
    assert.deepEqual(helper.pdfCalls, [
      [0, 30],
      [30, 42],
    ]);
    assert.equal(state(store, file)?.state, "done");
    assert.equal(Number(store.get("SELECT COUNT(*) AS n FROM segments WHERE kind = 'page'")?.n), 42);
  });

  it("stops at maxPages and says so", async () => {
    const helper = new FakeHelper();
    const { dir, store, indexer } = setup({ helper, options: { maxPages: 45 } });
    const file = join(dir, "book.pdf");
    add(store, file, "pdf");
    await indexer.run();
    await indexer.finishLongFiles();
    assert.deepEqual(state(store, file), {
      state: "done",
      detail: "the first 45 of 120 pages",
      info: { pages: "120", scanned_pages: "0" },
    });
  });

  it("ends a long file that can't be read further as done, keeping what was read", async () => {
    const helper = new FakeHelper();
    const { dir, store, indexer } = setup({ helper });
    const file = join(dir, "stuck.pdf");
    helper.timeouts.add("stuck.pdf");
    add(store, file, "pdf");
    await indexer.run();
    const steps: string[] = [];
    await indexer.finishLongFiles({ onStep: (step) => steps.push(`${step.state} ${step.note}`) });
    assert.deepEqual(steps, ["done stopped before page 31: it took more than 15 minutes to read"]);
    assert.deepEqual(state(store, file), {
      state: "done",
      detail: "The rest couldn't be read: it took more than 15 minutes to read",
      info: { pages: "120", scanned_pages: "0" },
    });
    assert.equal(Number(store.get("SELECT COUNT(*) AS n FROM segments WHERE kind = 'page'")?.n), 30);
  });
});

describe("pictures", () => {
  it("batches 8 of a kind, skips small ones, keeps the words on screen for keywords only", async () => {
    const helper = new FakeHelper();
    const { dir, store, indexer, embedder } = setup({ helper });
    const shots = Array.from({ length: 10 }, (_, i) => add(store, join(dir, `shot${i}.png`), "screenshot", 100 - i));
    add(store, join(dir, "photo.jpg"), "image", 1);
    add(store, join(dir, "icon.png"), "image", 0);
    helper.small.add("icon.png");
    embedder.failing.add("5.png"); // the sixth screenshot of the first batch
    const events: IndexEvent[] = [];
    const states = await indexer.run({ onEvent: (event) => events.push(event) });
    assert.deepEqual(states, { done: 10, failed: 1, skipped: 1 });
    // Batches: 8 screenshots, 2 screenshots, 2 images.
    assert.deepEqual(
      embedder.events.filter((event) => event.endsWith("start")).map((event) => event.split(" ")[1].split(",").length),
      [8, 2, 1],
    );
    const shot0 = state(store, join(dir, "shot0.png"));
    assert.deepEqual(shot0, { state: "done", detail: null, info: { height: "900", ocr_chars: "18", width: "1440" } });
    assert.equal(events[0].note, "ocr 18 chars");
    assert.deepEqual(state(store, join(dir, "shot5.png")), { state: "failed", detail: "can't read 5.png", info: null });
    assert.deepEqual(state(store, join(dir, "icon.png")), {
      state: "skipped",
      detail: "small image 32×32",
      info: null,
    });
    const ocr = store.get(
      "SELECT modality, vec IS NULL AS novec, excerpt FROM segments WHERE file = ? AND kind = 'ocr'",
      shots[0],
    );
    assert.deepEqual({ ...ocr }, { modality: "none", novec: 1, excerpt: "words on shot0.png" });
  });

  it("reads the next job while the model embeds this one", async () => {
    const helper = new FakeHelper();
    const { dir, store, indexer, embedder } = setup({ helper });
    for (let i = 0; i < 16; i++) add(store, join(dir, `p${String(i).padStart(2, "0")}.jpg`), "image", 100 - i);
    embedder.delayMs = 50;
    helper.events = embedder.events; // one timeline
    await indexer.run();
    const timeline = embedder.events;
    const firstEmbedEnd = timeline.findIndex((event) => event.startsWith("embed") && event.endsWith("end"));
    const secondJobRead = timeline.indexOf("read p08.jpg");
    assert.ok(secondJobRead >= 0 && secondJobRead < firstEmbedEnd, timeline.join("\n"));
  });

  it("a picture whose reading ran away fails with DigUp's watchdog words, and its scratch folder goes", async () => {
    const helper = new FakeHelper();
    const { dir, store, indexer, scratch } = setup({ helper });
    add(store, join(dir, "huge.jpg"), "image");
    helper.timeouts.add("huge.jpg");
    await indexer.run();
    assert.deepEqual(state(store, join(dir, "huge.jpg")), {
      state: "failed",
      detail: "It took more than 15 minutes to read",
      info: null,
    });
    assert.deepEqual(existsSync(scratch) ? readdirSync(scratch) : [], []);
  });
});

describe("the model", () => {
  it("records the vectors' model and settings, and resets an index made with others", async () => {
    let reset: [string, string] | null = null;
    const { dir, store, indexer } = setup({ onReset: (a: string, b: string) => (reset = [a, b]) });
    const file = write(dir, "docs/a.txt", "hello there");
    add(store, file, "doc");
    await indexer.run();
    const fingerprint = `${VECTOR_SOURCE} | ${optionsFingerprint(DEFAULT_OPTIONS)}`;
    assert.equal(store.meta("fingerprint"), fingerprint);
    assert.equal(store.meta("vector_source"), VECTOR_SOURCE);
    store.setMeta("fingerprint", "another model | photo140");
    indexer.checkModel();
    assert.deepEqual(reset, ["another model | photo140", fingerprint]);
    assert.equal(state(store, file)?.state, "pending");
  });

  it("without a reset hook, a different model stops indexing", () => {
    const { store, indexer } = setup({ onReset: null });
    store.setMeta("fingerprint", "another model | photo140");
    assert.throws(() => indexer.checkModel(), IndexerError);
  });

  it("a broken embedder ends the run and leaves the file pending", async () => {
    const { dir, store, indexer, embedder } = setup();
    const file = write(dir, "docs/a.txt", "hello there");
    add(store, file, "doc");
    embedder.broken = true;
    await assert.rejects(indexer.run(), EmbedderFailure);
    assert.equal(state(store, file)?.state, "pending");
  });

  it("asks between jobs whether to stop", async () => {
    const { dir, store, indexer } = setup();
    for (let i = 0; i < 5; i++) add(store, write(dir, `docs/${i}.txt`, `text number ${i}`), "doc");
    let jobs = 0;
    await indexer.run({ shouldStop: () => jobs >= 2, onEvent: () => jobs++ });
    assert.equal(store.pendingCount(), 3);
  });

  it("measures what indexing costs here (costs.json), not counting the model's start", async () => {
    const { dir, store, indexer } = setup();
    for (let i = 0; i < 3; i++) add(store, write(dir, `docs/${i}.txt`, `some words in file ${i}`), "doc");
    await indexer.run();
    const costs = JSON.parse(readFileSync(join(dir, "index", "costs.json"), "utf8"));
    assert.equal(costs.tallies.docChunk.units, 2); // the first job started the model
  });
});

describe("code", () => {
  it("gives the event loop a turn between jobs that need no model, so a stop is heard", async () => {
    const dir = tempDir();
    const store = Store.open(join(dir, "index", "code.sqlite"), { code: true });
    after(() => store.close());
    const indexer = new Indexer({
      store,
      options: { ...DEFAULT_OPTIONS, code: true },
      helper: new FakeHelper(),
      embedder: async () => new FakeEmbedder(),
      scratch: join(dir, "scratch"),
      home: dir,
    });
    // Tables of numbers: read here and kept for keywords only, with no helper or model to wait for.
    for (let i = 0; i < 1500; i++) add(store, write(dir, `numbers/${i}.py`, "1234 5678 9012\n"), "code");
    let stop = false;
    setTimeout(() => (stop = true), 0);
    const states = await indexer.run({ shouldStop: () => stop });
    const done = Object.values(states).reduce((sum, n) => sum + n, 0);
    assert.ok(done > 0 && done < 1500, `stopped part way: ${done} of 1500`);
  });

  it("embeds stretches with the file's path in its repo, and skips what a program made", async () => {
    const dir = tempDir();
    const store = Store.open(join(dir, "index", "code.sqlite"), { code: true });
    after(() => store.close());
    const embedder = new FakeEmbedder();
    const indexer = new Indexer({
      store,
      options: { ...DEFAULT_OPTIONS, code: true },
      helper: new FakeHelper(),
      embedder: async () => embedder,
      scratch: join(dir, "scratch"),
      home: dir,
    });
    const retry =
      write(dir, "billing/.git/HEAD", "ref: refs/heads/main\n") &&
      write(dir, "billing/pay/retry.py", "def retry_with_backoff(call):\n    return call()\n");
    const generated = write(
      dir,
      "billing/pay/model_pb2.py",
      "# Generated by the protocol buffer compiler.  DO NOT EDIT!\nx = 1\n",
    );
    add(store, retry, "code");
    add(store, generated, "code");
    const events: IndexEvent[] = [];
    await indexer.run({ onEvent: (event) => events.push(event) });
    assert.deepEqual(embedder.texts, [
      "title: billing/pay/retry.py | text: def retry_with_backoff(call):\n    return call()",
    ]);
    assert.deepEqual(state(store, retry), {
      state: "done",
      detail: null,
      info: { lines: "2", repo: join(dir, "billing") },
    });
    assert.deepEqual(state(store, generated), {
      state: "skipped",
      detail: "made by a program (“DO NOT EDIT”)",
      info: null,
    });
    const segment = store.get(
      "SELECT kind, loc, loc_end, excerpt FROM segments WHERE file = ? AND kind != 'name'",
      store.fileAt(retry)!.id,
    );
    assert.deepEqual({ ...segment }, { kind: "lines", loc: 1, loc_end: 2, excerpt: "def retry_with_backoff(call):" });
    assert.equal(events.find((event) => event.path === retry)?.note, "1 stretches, 2 lines");
  });
});

describe("media", { skip: noHelper }, () => {
  it("skips a recording with no usable sound", async () => {
    const { dir, store, indexer } = setup();
    // A second of silence, 16 kHz mono.
    const samples = 16000;
    const wav = Buffer.alloc(44 + samples * 2);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(36 + samples * 2, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(16000, 24);
    wav.writeUInt32LE(32000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(samples * 2, 40);
    const file = join(dir, "silence.wav");
    writeFileSync(file, wav);
    add(store, file, "audio");
    const events: IndexEvent[] = [];
    await indexer.run({ onEvent: (event) => events.push(event) });
    assert.deepEqual(state(store, file), { state: "skipped", detail: "silent or shorter than 2 s", info: null });
    assert.equal(events[0].note, "silent or too short");
  });
});
