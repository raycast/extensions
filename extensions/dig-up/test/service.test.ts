// The service (engine/service.ts): DigUp IndexService's loop (priorities, holds, yields) and Engine's search
// orchestration (warming, code routing, post-filters), with fake embedders and the real helper's walk.

import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { after, describe, it } from "node:test";
import type { Config } from "../engine/api";
import type { Embedder, EmbedderState } from "../engine/embedder";
import { Helper, HelperError } from "../engine/helper";
import type { InstallProgress } from "../engine/install";
import { silentLog, type Log } from "../engine/log";
import { makePaths } from "../engine/paths";
import { Service, type Embedders, type ServiceDeps, type ServiceHelper } from "../engine/service";
import { ThumbCache, imageSize, thumbArgs } from "../engine/service-thumbs";
import type { Searcher } from "../engine/searcher";
import type { Store } from "../engine/store";
import { DIMENSION } from "../engine/types";

const repo = resolve(import.meta.dirname, "..");
const bin = join(repo, "assets/digup-helper");
const noHelper = existsSync(bin) ? false : `${bin} is missing: build it with scripts/build-helper.sh`;

const temps: string[] = [];
after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});
function tempDir(): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "dig-up-service-")));
  temps.push(dir);
  return dir;
}

function write(root: string, path: string, body: string): string {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
  return file;
}

function unit(input: string): Float32Array {
  const vector = new Float32Array(DIMENSION);
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) hash = Math.imul(hash ^ input.charCodeAt(i), 16777619);
  vector[Math.abs(hash) % DIMENSION] = 1;
  return vector;
}

class FakeEmbedder implements Embedder {
  texts: string[] = [];
  async embedTexts(texts: string[]) {
    this.texts.push(...texts);
    // The query "same as doc" finds the document whose text it repeats: a shared vector.
    return texts.map((text) => unit(text.replace(/^task: [^|]*\| query: /, "").replace(/^title: [^|]*\| text: /, "")));
  }
  async embedImages(paths: string[]) {
    return paths.map(unit);
  }
  async embedAudio(paths: string[]) {
    return paths.map(unit);
  }
}

/** Embedders whose query server starts when the test says so. */
class FakeEmbedders implements Embedders {
  readonly index_ = new FakeEmbedder();
  readonly query_ = new FakeEmbedder();
  queryState: EmbedderState = "ready";
  indexed = 0;
  done = 0;
  private release: (() => void) | null = null;
  private starting: Promise<void> | null = null;

  /** Puts the query server back to "off": the next query() starts it, and it's ready on `finishStart()`. */
  coldStart(): void {
    this.queryState = "off";
  }

  finishStart(): void {
    this.release?.();
  }

  async query(): Promise<Embedder> {
    if (this.queryState === "off") {
      this.queryState = "starting";
      this.starting = new Promise<void>((done) => (this.release = done)).then(() => {
        this.queryState = "ready";
      });
    }
    if (this.queryState === "starting") await this.starting;
    return this.query_;
  }

  async index(): Promise<Embedder> {
    this.indexed++;
    return this.index_;
  }

  doneIndexing(): void {
    this.done++;
  }

  state(): EmbedderState {
    return this.queryState;
  }

  async stop(): Promise<void> {}
}

function config(o: Partial<Config> = {}): Config {
  return {
    folders: [],
    skipped: [],
    codeFolders: [],
    codeSkipped: [],
    excludedExtensions: [],
    indexOnBattery: true,
    indexHours: null,
    paused: false,
    codeQuietSeconds: 60,
    llamaServerPath: null,
    modelFolder: null,
    ...o,
  };
}

interface Made {
  service: Service;
  embedders: FakeEmbedders;
  support: string;
  root: string;
}

function make(
  o: { config?: Partial<Config>; deps?: Partial<ServiceDeps>; model?: boolean; root?: string; log?: Log } = {},
): Made {
  const support = tempDir();
  const root = o.root ?? tempDir();
  const embedders = new FakeEmbedders();
  const model = o.model ?? true;
  const service = new Service({
    paths: makePaths(support, join(repo, "assets")),
    config: config(o.config),
    log: o.log ?? silentLog,
    deps: {
      makeHelper: () => new Helper(bin, silentLog),
      makeEmbedders: () => embedders,
      findLlama: () => (model ? { bin: "/fake/llama-server", build: 11624 } : { bin: null, reason: "none" }),
      findModels: () =>
        model ? { text: "/fake/text.gguf", media: "/fake/media.gguf" } : { text: null, media: null, reason: "none" },
      home: support,
      git: null,
      ...o.deps,
    },
  });
  after(() => service.stop());
  return { service, embedders, support, root };
}

async function until(check: () => boolean, what: string, ms = 20_000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((done) => setTimeout(done, 20));
  }
}

const idle = (service: Service) => () => service.status().activity.state === "idle";
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
/** The index the service has open (to make it fail on purpose). */
const mainStore = (service: Service) => (service as unknown as { main: { store: Store } }).main.store;

/** The real helper, but `rich` (Word, RTF) never answers until the helper is closed: a read stuck in the helper. */
function stuckHelper(): ServiceHelper {
  const helper = new Helper(bin, silentLog);
  let fail: ((error: Error) => void) | null = null;
  return {
    walk: helper.walk.bind(helper),
    image: helper.image.bind(helper),
    pdf: helper.pdf.bind(helper),
    audio: helper.audio.bind(helper),
    video: helper.video.bind(helper),
    thumb: helper.thumb.bind(helper),
    pages: helper.pages.bind(helper),
    durations: helper.durations.bind(helper),
    openPdf: helper.openPdf.bind(helper),
    openMedia: helper.openMedia.bind(helper),
    rich: () => new Promise((_, reject) => (fail = reject)),
    async close() {
      fail?.(new HelperError("the helper is closed", "closed", "rich"));
      await helper.close();
    },
  };
}

/** A grey PNG of `width` × `height`. */
function png(width: number, height: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits
  header[9] = 0; // greyscale
  const rows = Buffer.alloc((width + 1) * height, 0x80);
  for (let row = 0; row < height; row++) rows[row * (width + 1)] = 0; // no filter
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

describe("indexing passes", { skip: noHelper }, () => {
  it("syncs, reads new files, then code, then the rest of long files", async () => {
    const root = tempDir();
    const code = tempDir();
    write(root, "notes.md", "a short note about the garden");
    write(root, "long.md", Array.from({ length: 20_000 }, (_, i) => `word${i % 89}`).join(" "));
    write(code, "tools/backup.sh", "rsync -a ~/Pictures /Volumes/Backup\n");
    const { service, embedders } = make({ root, config: { folders: [root], codeFolders: [code] } });
    service.start();
    await until(() => {
      const status = service.status();
      return status.activity.state === "idle" && status.main.total.done === 2;
    }, "the pass");
    const texts = embedders.index_.texts;
    const codeAt = texts.findIndex((text) => text.startsWith("title: tools/backup.sh"));
    const shortAt = texts.findIndex((text) => text.includes("garden"));
    assert.ok(shortAt >= 0 && codeAt > shortAt, "code after the main index's files");
    // The long file's first 40 chunks come before code; its rest after.
    const longChunks = texts
      .map((text, at) => [text, at] as const)
      .filter(([text]) => text.startsWith("title: long |"));
    assert.ok(longChunks.length > 40);
    assert.ok(longChunks[39][1] < codeAt && longChunks[40][1] > codeAt);
    const status = service.status();
    assert.equal(status.main.total.files, 2);
    assert.equal(status.main.unfinished.files, 0);
    assert.equal(status.code?.total.done, 1);
    assert.equal(status.held, null);
    assert.ok(embedders.done >= 1, "the index server may stop after the linger");
    assert.deepEqual(
      status.folderSummaries?.map((s) => [s.files, s.indexed, s.pending]),
      [[2, 2, 0]],
    );
    // Each pass's scratch folders go with it.
    const scratch = makePaths(tmpdir(), repo).scratch;
    assert.deepEqual(existsSync(scratch) ? readdirSync(scratch) : [], []);
  });

  it("on battery: up to 50 new files at once, a bigger first pass waits", async () => {
    const root = tempDir();
    for (let i = 0; i < 3; i++) write(root, `few/${i}.txt`, `a few words in file ${i}`);
    const { service } = make({ root, config: { folders: [root] } });
    service.setHeld("on battery");
    service.start();
    await until(
      () => service.status().main.total.done === 3 && service.status().activity.state === "idle",
      "new files",
    );
    for (let i = 0; i < 60; i++) write(root, `many/${i}.txt`, `more words in file ${i}`);
    service.requestSync();
    await until(() => service.status().main.total.pending === 60, "the second sync");
    await until(idle(service), "idle");
    assert.equal(service.status().main.total.done, 3);
    assert.equal(service.status().held, "on battery");
    service.setHeld(null);
    await until(() => service.status().main.total.done === 63, "the first pass");
  });

  it('paused: no pass runs, and "paused" wins over other holds', async () => {
    const root = tempDir();
    write(root, "a.txt", "words to index");
    const { service } = make({ root, config: { folders: [root], paused: true } });
    service.setHeld("on battery");
    service.start();
    await new Promise((done) => setTimeout(done, 300));
    const status = service.status();
    assert.equal(status.held, "paused");
    assert.equal(status.main.total.files, 0); // not even synced
    service.setConfig(config({ folders: [root], paused: false }));
    service.setHeld(null);
    await until(() => service.status().main.total.done === 1, "resume");
  });

  it("outside the index hours: nothing runs; heldUntil says when it may", async () => {
    const root = tempDir();
    write(root, "a.txt", "words to index");
    const { service } = make({ root, config: { folders: [root] } });
    const until1am = Date.now() + 3_600_000;
    service.setHeld("outside index hours", until1am);
    service.start();
    await new Promise((done) => setTimeout(done, 300));
    assert.equal(service.status().held, "outside index hours");
    assert.equal(service.status().heldUntil, until1am);
    assert.equal(service.status().main.total.files, 0);
    service.setHeld(null);
    await until(() => service.status().main.total.done === 1, "the hours");
  });

  it("without the model, finds and names files (searchable by name) and embeds nothing", async () => {
    const root = tempDir();
    write(root, "Invoice INV-2041.txt", "words");
    const { service, embedders } = make({ root, config: { folders: [root] }, model: false });
    service.start();
    await until(
      () => service.status().main.total.pending === 1 && service.status().activity.state === "idle",
      "the sync",
    );
    const status = service.status();
    assert.deepEqual(status.setup, { state: "missing", missing: ["model-text", "model-media", "llama"] });
    assert.equal(status.held, "setup");
    assert.equal(embedders.indexed, 0);
    const found = await service.search({ query: "INV-2041" });
    assert.equal(found.hits.length, 1);
    assert.equal(found.note, "unavailable");
  });

  it("a changed folder list prunes and syncs; a missing folder is reported and its files kept", async () => {
    const root = tempDir();
    const other = tempDir();
    write(root, "a.txt", "first folder");
    write(other, "b.txt", "second folder");
    const { service } = make({ root, config: { folders: [root, other] } });
    service.start();
    await until(
      () => service.status().main.total.done === 2 && service.status().activity.state === "idle",
      "two folders",
    );
    rmSync(other, { recursive: true });
    service.requestSync();
    await until(() => (service.status().missingFolders ?? []).includes(other), "missing folder");
    // Scope: only connected folders count (the counts follow within a second).
    await until(() => service.status().main.total.files === 1, "the counts");
    service.setConfig(config({ folders: [root] }));
    await until(idle(service), "the new pass");
    await until(() => service.status().folderSummaries?.length === 1, "summaries");
    const search = await service.search({ query: "second", meaning: false });
    assert.equal(search.hits.length, 0);
  });

  it("with the search vectors loaded, a pass appends its new ones; only a removal reads them all again", async () => {
    const root = tempDir();
    write(root, "a.txt", "the first file's words");
    const { service } = make({ root, config: { folders: [root] } });
    service.start();
    await until(() => service.status().main.total.done === 1 && idle(service)(), "the first pass");
    await service.prewarm();
    const searcher = (service as unknown as { main: { searcher: Searcher } }).main.searcher;
    let reloads = 0;
    let appends = 0;
    const reload = searcher.reload.bind(searcher);
    const append = searcher.appendNew.bind(searcher);
    searcher.reload = () => {
      reloads++;
      reload();
    };
    searcher.appendNew = () => {
      appends++;
      return append();
    };
    for (let i = 0; i < 3; i++) write(root, `new${i}.txt`, `a new file, number ${i}`);
    service.requestSync();
    await until(() => service.status().main.total.done === 4 && idle(service)(), "the new files");
    assert.equal(reloads, 0, "no full reload: nothing was removed");
    assert.ok(appends >= 1);
    assert.equal(searcher.vectorCount, 4);
    rmSync(join(root, "new0.txt"));
    service.requestSync();
    await until(() => reloads === 1 && idle(service)(), "a full reload after the removal");
    assert.equal(searcher.vectorCount, 3);
  });

  it("reindex drops the vectors and reads everything again", async () => {
    const root = tempDir();
    write(root, "a.txt", "words to index");
    const { service, embedders } = make({ root, config: { folders: [root] } });
    service.start();
    await until(
      () => service.status().main.total.done === 1 && service.status().activity.state === "idle",
      "first pass",
    );
    const before = embedders.index_.texts.length;
    await service.reindex(false);
    await until(
      () => embedders.index_.texts.length === before + 1 && service.status().activity.state === "idle",
      "reindex",
    );
  });
});

describe("failures, retries and cuts", { skip: noHelper }, () => {
  it("a pass that fails every time is tried again later, not in a loop: the event loop keeps running", async () => {
    const root = tempDir();
    write(root, "a.txt", "words to index");
    const errors: string[] = [];
    const log: Log = { info: () => {}, warn: () => {}, error: (line) => errors.push(line) };
    const { service } = make({ root, deps: { retryBaseMs: 100 }, log });
    service.start();
    await until(idle(service), "the start");
    // A fault that stays (a full disk, a broken page): every pass fails in its first step.
    const store = mainStore(service);
    store.meta = () => {
      throw new Error("disk I/O error");
    };
    let ticks = 0;
    const ticking = setInterval(() => ticks++, 10);
    service.setConfig(config({ folders: [root] }));
    await sleep(600);
    clearInterval(ticking);
    assert.ok(ticks >= 20, `timers ran meanwhile (${ticks} ticks)`);
    const attempts = errors.filter((line) => line.includes("Indexing stopped: disk I/O error")).length;
    assert.ok(attempts >= 2 && attempts <= 6, `tried again after 100, 200, 400 ms: ${attempts} tries`);
    assert.equal(service.status().activity.state, "failed");
    // The fault goes away: the next try indexes.
    delete (store as { meta?: unknown }).meta;
    await until(() => service.status().main.total.done === 1, "the next try", 5000);
  });

  it("opens the index once it can, and has the model ready meanwhile", async () => {
    const root = tempDir();
    write(root, "a.txt", "words to index");
    const { service, support } = make({ root, config: { folders: [root] }, deps: { retryBaseMs: 100 } });
    const db = makePaths(support, join(repo, "assets")).mainDb;
    mkdirSync(db, { recursive: true }); // a folder where the index goes: it can't be opened
    service.start();
    assert.deepEqual(service.status().activity, { state: "failed", problem: "Can't open the index" });
    assert.equal(service.status().setup.state, "ready");
    rmSync(db, { recursive: true });
    await until(() => service.status().main.total.done === 1, "the index and the pass", 5000);
  });

  it("a prune that failed is done with the next pass", async () => {
    const root = tempDir();
    const other = tempDir();
    write(root, "a.txt", "first folder");
    write(other, "b.txt", "second folder");
    const { service } = make({ root, config: { folders: [root, other] }, deps: { retryBaseMs: 100 } });
    service.start();
    await until(() => service.status().main.total.done === 2 && idle(service)(), "two folders");
    const store = mainStore(service);
    const prune = store.prune.bind(store);
    let failures = 1;
    store.prune = (keep) => {
      if (failures-- > 0) throw new Error("database is locked");
      return prune(keep);
    };
    service.setConfig(config({ folders: [root] }));
    await until(() => store.files([other]).length === 0, "the removed folder's files gone", 5000);
  });

  it("a new llama.cpp mid-pass restarts the pass; the job it cut short is no failure", async () => {
    const root = tempDir();
    for (let i = 0; i < 4; i++) write(root, `${i}.txt`, `file number ${i} with a few words`);
    let generation = 0;
    // Like EmbedderManager: stop() makes the request in flight fail.
    const embedders: Embedders = {
      query: async () => new FakeEmbedder(),
      index: async () => {
        const mine = generation;
        const vectors = new FakeEmbedder();
        vectors.embedTexts = async (texts: string[]) => {
          await sleep(150);
          if (mine !== generation) throw new Error("llama-server (index) was stopped");
          return texts.map(unit);
        };
        return vectors;
      },
      doneIndexing() {},
      state: () => "ready",
      stop: async () => {
        generation++;
      },
    };
    const { service } = make({
      root,
      config: { folders: [root] },
      deps: {
        makeEmbedders: () => embedders,
        findLlama: (_paths, override) => ({ bin: override ?? "/fake/llama-server", build: 11624 }),
      },
    });
    service.start();
    await until(() => service.status().activity.state === "indexing", "indexing");
    const states = new Set<string>();
    const watching = setInterval(() => states.add(service.status().activity.state), 10);
    service.setConfig(config({ folders: [root], llamaServerPath: "/other/llama-server" }));
    await until(() => service.status().main.total.done === 4 && idle(service)(), "all four, after the restart", 10_000);
    clearInterval(watching);
    assert.ok(!states.has("failed"), [...states].join(", "));
    assert.equal(service.status().lastError, null);
  });

  it("indexing starts once the model is found through the settings", async () => {
    const root = tempDir();
    write(root, "a.txt", "words to index");
    const { service } = make({
      root,
      config: { folders: [root] },
      deps: {
        findModels: (_paths, folder) =>
          folder ? { text: "/m/text.gguf", media: "/m/media.gguf" } : { text: null, media: null, reason: "none" },
      },
    });
    service.start();
    await until(() => service.status().main.total.pending === 1 && idle(service)(), "names only");
    assert.equal(service.status().held, "setup");
    service.setConfig(config({ folders: [root], modelFolder: "/m" }));
    await until(() => service.status().main.total.done === 1, "indexing");
  });

  it("Pause ends a job stuck in the helper after the cut; its file stays pending and is read on resume", async () => {
    const root = tempDir();
    write(root, "letter.rtf", String.raw`{\rtf1\ansi Dear neighbour, the hedge needs trimming.}`);
    let indexHelpers = 0;
    const { service } = make({
      root,
      config: { folders: [root] },
      deps: {
        stopCutMs: 200,
        makeHelper: (role) => (role === "index" && ++indexHelpers === 1 ? stuckHelper() : new Helper(bin, silentLog)),
      },
    });
    service.start();
    await until(() => service.status().activity.state === "indexing", "the read under way");
    await sleep(100);
    service.setConfig(config({ folders: [root], paused: true }));
    const paused = Date.now();
    await until(idle(service), "the pass to end", 3000);
    assert.ok(Date.now() - paused >= 150, "it waited for the job first");
    assert.equal(service.status().held, "paused");
    assert.equal(service.status().lastError, null);
    await until(
      () => service.status().main.total.pending === 1,
      "the file still pending (counts follow within a second)",
    );
    service.setConfig(config({ folders: [root], paused: false }));
    await until(() => service.status().main.total.done === 1, "read with a new helper");
    assert.equal(indexHelpers, 2);
  });
});

describe("search", { skip: noHelper }, () => {
  async function ready(o: { config?: Partial<Config>; files?: Record<string, string> } = {}) {
    const root = tempDir();
    for (const [path, body] of Object.entries(o.files ?? {})) write(root, path, body);
    const made = make({ root, config: { folders: [root], ...o.config } });
    made.service.start();
    await until(() => {
      const status = made.service.status();
      return status.activity.state === "idle" && status.main.total.pending === 0 && status.main.total.files > 0;
    }, "indexing");
    return made;
  }

  it('answers with words while the query encoder starts ("warming"), with meaning once it\'s ready', async () => {
    const { service, embedders } = await ready({ files: { "garden.txt": "tomatoes in the garden" } });
    embedders.coldStart();
    const first = await service.search({ query: "tomatoes in the garden" });
    assert.equal(first.meaning, false);
    assert.equal(first.note, "warming");
    assert.equal(first.hits.length, 1); // the words still match
    assert.equal(embedders.state(), "starting");
    embedders.finishStart();
    await until(() => embedders.state() === "ready", "the encoder");
    const second = await service.search({ query: "tomatoes in the garden" });
    assert.equal(second.meaning, true);
    assert.equal(second.note, null);
    assert.equal(second.hits[0].z !== null, true);
    assert.equal(second.strong, 1);
    assert.deepEqual(second.terms, ["tomatoes", "garden"]);
  });

  it("embeds ahead in the keyword phase and keeps the vector (one embed for both phases)", async () => {
    const { service, embedders } = await ready({ files: { "a.txt": "a note about bread" } });
    const words = await service.search({ query: "bread", meaning: false, prefixLast: true });
    assert.equal(words.meaning, false);
    await until(() => embedders.query_.texts.length === 1, "embed-ahead");
    const final = await service.search({ query: "bread" });
    assert.equal(final.meaning, true);
    assert.equal(embedders.query_.texts.length, 1);
    assert.equal(embedders.query_.texts[0], "task: search result | query: bread");
  });

  it("routes code: to the code index, with notes when there's none or nothing to search", async () => {
    const code = tempDir();
    write(code, "lib/retry.py", "def retry_with_backoff(call):\n    return call()\n");
    const { service, embedders } = await ready({
      files: { "retry notes.txt": "notes about retry" },
      config: { codeFolders: [code] },
    });
    await until(() => service.status().code?.total.done === 1, "code index");
    const hint = await service.search({ query: "code:" });
    assert.deepEqual([hint.code, hint.note, hint.hits.length], [true, "code-hint", 0]);
    const found = await service.search({ query: "  CODE: retry_with_backoff" });
    assert.equal(found.code, true);
    assert.deepEqual(
      found.hits.map((hit) => hit.path),
      [join(code, "lib/retry.py")],
    );
    assert.equal(found.hits[0].focus, 1);
    assert.ok(embedders.query_.texts.includes("task: code retrieval | query: retry_with_backoff"));
    const main = await service.search({ query: "retry" });
    assert.equal(main.code, false);
    assert.ok(main.hits.every((hit) => !hit.path.endsWith(".py")));
    service.setConfig(config({ folders: [service.status().folders[0]], codeFolders: [] }));
    const off = await service.search({ query: "code: retry" });
    assert.deepEqual([off.code, off.note], [true, "code-off"]);
  });

  it("leaves out files no longer searched, skipped types and deleted files", async () => {
    const { service, root } = await ready({
      files: { "keep/a.txt": "apples", "skip/b.txt": "apples", "c.md": "apples", "gone.txt": "apples" },
    });
    assert.equal((await service.search({ query: "apples", meaning: false })).hits.length, 4);
    rmSync(join(root, "gone.txt"));
    service.setHeld("paused"); // no sync: the rows outlive the change
    service.setConfig(config({ folders: [root], skipped: [join(root, "skip")], excludedExtensions: ["md"] }));
    const hits = (await service.search({ query: "apples", meaning: false })).hits.map((hit) => hit.path);
    assert.deepEqual(hits, [join(root, "keep/a.txt")]);
  });

  it("returns at most 40 by default, and the kinds asked for", async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 45; i++) files[`n${i}.txt`] = `walnut ${i}`;
    const { service } = await ready({ files });
    assert.equal((await service.search({ query: "walnut", meaning: false })).hits.length, 40);
    assert.equal((await service.search({ query: "walnut", meaning: false, kinds: ["pdf"] })).hits.length, 0);
    assert.equal((await service.search({ query: "walnut", meaning: false, limit: 5 })).hits.length, 5);
  });
});

describe("setup", () => {
  it("downloads what's missing, shows progress and the network wait, then indexes", async () => {
    let installed = false;
    const progress: InstallProgress[] = [
      { phase: "downloading", what: "embeddinggemma-2-Q8_0.gguf", bytes: 100, total: 1000 },
      { phase: "retrying", what: "embeddinggemma-2-Q8_0.gguf", bytes: 100, total: 1000, error: "ECONNRESET" },
    ];
    let seen: unknown[] = [];
    let resume!: () => void;
    const { service } = make({
      model: false,
      deps: {
        findLlama: () => ({ bin: "/fake/llama-server", build: 11624 }),
        findModels: () => (installed ? { text: "/t", media: "/m" } : { text: null, media: null, reason: "none" }),
        installModels: async (_paths, report) => {
          for (const p of progress) report(p);
          await new Promise<void>((done) => (resume = done));
          installed = true;
          return { text: "/t", media: "/m" };
        },
      },
    });
    service.start();
    assert.deepEqual(service.status().setup, { state: "missing", missing: ["model-text", "model-media"] });
    const done = service.setup();
    // At once, so the reply to POST /setup already shows the download.
    assert.equal(service.status().setup.state, "downloading");
    await until(
      () => service.status().setup.state === "downloading" && (service.status().setup as { bytes: number }).bytes > 0,
      "the download",
    );
    seen = [service.status().setup];
    assert.deepEqual(seen, [
      {
        state: "downloading",
        what: "embeddinggemma-2-Q8_0.gguf",
        bytes: 100,
        total: 1000,
        waiting: "Waiting for the network…",
      },
    ]);
    resume();
    await done;
    assert.deepEqual(service.status().setup, { state: "ready" });
  });
});

describe("folders, previews and estimates", { skip: noHelper }, () => {
  it("estimates a folder from metadata, with its subfolders", async () => {
    const root = tempDir();
    write(root, "a/one.txt", "x".repeat(10_000));
    write(root, "b/two.txt", "y");
    write(root, "c.txt", "z");
    const { service } = make();
    const [estimate] = await service.estimate({ folders: [root] });
    assert.equal(estimate.folder, root);
    assert.equal(estimate.files, 3);
    assert.deepEqual(estimate.byKind, { doc: 3 });
    // 5 chunks guessed for 10,000 bytes, 1 for each small file: 7 × 0.045 s.
    assert.ok(Math.abs(estimate.seconds - 7 * 0.045) < 1e-9);
    assert.deepEqual(
      estimate.subfolders?.map((s) => [s.folder.slice(root.length + 1), s.files]),
      [
        ["a", 1],
        ["b", 1],
      ],
    );
    const [missing] = await service.estimate({ folders: [join(root, "nope")] });
    assert.equal(missing.readable, false);
    const aborted = new AbortController();
    aborted.abort();
    await assert.rejects(service.estimate({ folders: [root] }, aborted.signal));
  });

  it("tells readable folders from others", async () => {
    const root = tempDir();
    const { service } = make();
    const replies = await service.access([root, join(root, "nope")]);
    assert.deepEqual(replies, [
      { folder: root, readable: true },
      { folder: join(root, "nope"), readable: false, error: "it isn't there" },
    ]);
  });

  it("suggests the home folder's code folders", () => {
    const { service, support } = make();
    write(support, "Projects/app/.git/HEAD", "ref");
    write(support, "Documents/GitHub/site/.git/HEAD", "ref");
    write(support, "Music/band/.git/HEAD", "ref");
    assert.deepEqual(service.suggestCodeFolders(), [join(support, "Projects")]);
  });

  it("asks the helper for the right picture and keeps it", async () => {
    assert.deepEqual(thumbArgs({ path: "/a.pdf", kind: "pdf", loc: 3, words: ["fuji"] }, "/o.png"), {
      path: "/a.pdf",
      out: "/o.png",
      maxPixel: 600,
      page: 3,
      words: ["fuji"],
    });
    assert.deepEqual(thumbArgs({ path: "/a.mp4", kind: "video", loc: 6.5, maxPixel: 300 }, "/o.jpg").time, 6.5);
    assert.deepEqual(thumbArgs({ path: "/a.wav", kind: "audio", loc: 25, locEnd: 55 }, "/o.png").range, [25, 55]);
    const root = tempDir();
    const file = join(root, "dot.png");
    writeFileSync(file, png(40, 20));
    assert.deepEqual(imageSize(file), { width: 40, height: 20 });
    const { service } = make();
    const first = await service.thumb({ path: file, kind: "image", maxPixel: 64 });
    assert.ok(existsSync(first.path));
    const again = await service.thumb({ path: file, kind: "image", maxPixel: 64 });
    assert.deepEqual(again, first);
    // A file that's gone is a final answer (404), not an engine failure the preview asks again about.
    await assert.rejects(
      service.thumb({ path: join(root, "gone.png"), kind: "image" }),
      (error: { status?: number }) => error.status === 404,
    );
  });

  it("calls off a picture nobody waits for any more; one still wanted is drawn", async () => {
    const root = tempDir();
    const file = join(root, "dot.png");
    writeFileSync(file, png(40, 20));
    const asked: AbortSignal[] = [];
    const cache = new ThumbCache(
      join(root, "thumbs"),
      () => ({
        thumb: async (args, options) => {
          asked.push(options!.signal!);
          await sleep(50);
          writeFileSync(args.out, png(8, 8));
          return { path: args.out, width: 8, height: 8 };
        },
      }),
      silentLog,
    );
    const gone = new AbortController();
    const left = cache.thumb({ path: file, kind: "image", maxPixel: 10 }, gone.signal);
    gone.abort(new Error("arrowed past"));
    await assert.rejects(left, /arrowed past/);
    assert.ok(asked[0].aborted, "the helper's request was called off");
    // Two want the same picture and one goes away: the other still gets it.
    const a = new AbortController();
    const b = new AbortController();
    const first = cache.thumb({ path: file, kind: "image", maxPixel: 20 }, a.signal);
    const second = cache.thumb({ path: file, kind: "image", maxPixel: 20 }, b.signal);
    a.abort(new Error("arrowed past"));
    await assert.rejects(first);
    assert.equal((await second).width, 8);
    assert.equal(asked.length, 2);
    assert.ok(!asked[1].aborted);
  });
});
