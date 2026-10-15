// Ported from DigUp's IndexStoreTests.swift (prune, scope, stopped files, a folder spelled another way), plus the
// IndexStore behaviors the indexer relies on: the schema, name rows, requeue, move, delete, resetAll, pending order,
// long files, info, segments and counts.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { after, describe, test } from "node:test";
import { Store, TOKENIZER, fileNumber, infoJSON, parseInfo, type Candidate, type FileNumber } from "../engine/store";
import { DIMENSION, type FileKind } from "../engine/types";

const root = mkdtempSync(join(tmpdir(), "dig-up-store-"));
after(() => rmSync(root, { recursive: true, force: true }));

let made = 0;
function freshStore(o: { code?: boolean; home?: string } = {}): Store {
  const store = Store.open(join(root, `store-${++made}`, "index.sqlite"), { code: o.code ?? false, home: o.home });
  after(() => store.close());
  return store;
}

function file(path: string, inode: FileNumber, kind: FileKind = "image", mtime = 1): Candidate {
  return { path, kind, size: 10, mtime, inode, device: 1 };
}

const count = (store: Store, sql: string, ...values: Array<string | number>) =>
  Number(store.get(sql, ...values)?.n ?? -1);

const unit = (index: number) => Array.from({ length: DIMENSION }, (_, i) => (i === index ? 1 : 0));

describe("schema", () => {
  test("a new index is DigUp's schema 5, in WAL mode", () => {
    const store = freshStore();
    assert.equal(store.get("PRAGMA user_version")?.user_version, 5);
    assert.equal(store.get("PRAGMA journal_mode")?.journal_mode, "wal");
    assert.equal(store.get("PRAGMA synchronous")?.synchronous, 1); // NORMAL
    assert.equal(store.get("PRAGMA foreign_keys")?.foreign_keys, 1);
    assert.equal(store.get("PRAGMA busy_timeout")?.timeout, 5000);
    const names = store
      .all(
        "SELECT name FROM sqlite_master WHERE type IN ('table', 'index') " +
          "AND name NOT LIKE 'fts_%' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .map((row) => row.name);
    assert.deepEqual(names, ["files", "files_inode", "files_state", "fts", "meta", "segments", "segments_file"]);
    assert.equal(
      store.get("SELECT sql FROM sqlite_master WHERE name = 'fts'")?.sql,
      `CREATE VIRTUAL TABLE fts USING fts5(name, body, original UNINDEXED, tokenize = "${TOKENIZER}")`,
    );
    assert.equal(TOKENIZER, "porter unicode61 remove_diacritics 2 categories 'L* N* Co M*'");
    const files = store.get("SELECT sql FROM sqlite_master WHERE name = 'files'")?.sql as string;
    assert.match(files, /state TEXT NOT NULL DEFAULT 'pending'/);
    const segments = store.get("SELECT sql FROM sqlite_master WHERE name = 'segments'")?.sql as string;
    assert.match(segments, /file INTEGER NOT NULL REFERENCES files\(id\) ON DELETE CASCADE/);
  });

  test("reopening keeps what was there", () => {
    const path = join(root, "reopen", "index.sqlite");
    const first = Store.open(path, { code: false });
    first.insert(file("/a/x.png", 1));
    first.setMeta("fingerprint", "f");
    first.close();
    const again = Store.open(path, { code: false });
    after(() => again.close());
    assert.equal(again.files(["/a"]).length, 1);
    assert.equal(again.meta("fingerprint"), "f");
  });

  test("an index from a newer schema, or an old DigUp one, is refused", () => {
    const newer = join(root, "newer.sqlite");
    const db = new DatabaseSync(newer);
    db.exec("PRAGMA user_version = 6");
    db.close();
    assert.throws(() => Store.open(newer, { code: false }), /newer Dig Up \(schema 6\)/);
    const older = join(root, "older.sqlite");
    const old = new DatabaseSync(older);
    old.exec("CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL); PRAGMA user_version = 1");
    old.close();
    assert.throws(() => Store.open(older, { code: false }), /old schema \(1\)/);
  });

  test("meta and the model it was built with", () => {
    const store = freshStore();
    assert.equal(store.meta("fingerprint"), null);
    store.setModel("source | photo140", "source");
    assert.equal(store.fingerprint(), "source | photo140");
    assert.equal(store.vectorSource(), "source");
    store.setMeta("fingerprint", "other");
    assert.equal(store.fingerprint(), "other");
    store.setMeta("fingerprint", null);
    assert.equal(store.fingerprint(), null);
  });

  test("a transaction rolls back on a throw, and one inside another joins it", () => {
    const store = freshStore();
    assert.throws(() =>
      store.transaction(() => {
        store.insert(file("/a/x.png", 1));
        throw new Error("stop");
      }),
    );
    assert.equal(store.files(["/a"]).length, 0);
    store.transaction(() => {
      store.insert(file("/a/x.png", 1));
      store.insert(file("/b/y.png", 2));
      assert.equal(store.prune(["/a"]), 1); // prune's own transaction joins this one
    });
    assert.deepEqual(
      store.files(["/a", "/b"]).map((f) => f.path),
      ["/a/x.png"],
    );
  });

  test("a transaction's body can't be async: it's refused, and what it wrote before its await rolled back", () => {
    const store = freshStore();
    const before = async () => {
      store.insert(file("/a/x.png", 1));
      await null;
    };
    // @ts-expect-error -- an async body doesn't type-check either
    assert.throws(() => store.transaction(before), /can't be async/);
    assert.equal(store.files(["/a"]).length, 0);
    assert.throws(
      () =>
        store.transaction(() => {
          store.insert(file("/a/y.png", 2));
          // @ts-expect-error -- nor inside another transaction
          store.transaction(async () => {});
        }),
      /can't be async/,
    );
    assert.equal(store.files(["/a"]).length, 0);
    store.transaction(() => store.insert(file("/a/z.png", 3)));
    assert.equal(store.files(["/a"]).length, 1);
  });
});

describe("files", () => {
  test("a file's name and folders are searchable at once", () => {
    const home = "/Users/someone";
    const store = freshStore({ home });
    const id = store.insert(file(`${home}/Downloads/Invoices/ﬁle 2041.PDF`, 1, "pdf"));
    const row = store.get(
      "SELECT s.kind, s.modality, fts.name, fts.body, fts.original FROM segments s JOIN fts ON fts.rowid = s.id " +
        "WHERE s.file = ?",
      id,
    );
    assert.deepEqual(
      { ...row },
      { kind: "name", modality: "none", name: "file 2041.PDF", body: "Downloads Invoices", original: null },
    );
    assert.equal(Store.folderText("/Volumes/Drive/a/b.png", home), "Volumes Drive a");
    assert.equal(Store.folderText(`${home}/b.png`, home), "");
    // Swift's hasPrefix and dropFirst: by Characters, under canonical equivalence (DigUp's output, from swiftc).
    assert.equal(Store.folderText("/Users/jos\u00e9/Desktop/x.png", "/Users/jose\u0301"), "Desktop");
    assert.equal(Store.folderText("/Users/jose\u0301/Desktop/x.png", "/Users/jos\u00e9"), "Desktop");
    assert.equal(Store.folderText("/Users/jose\u0301/Desktop/x.png", "/Users/jose"), "Users jose\u0301 Desktop");
    assert.equal(Store.folderText("/Users/jos\u00e9/a/b/x.png", "/Users/jo"), "s\u00e9 a b"); // no folder boundary
    const nfdHome = freshStore({ home: "/Users/jose\u0301" });
    const shot = nfdHome.insert(file("/Users/jos\u00e9/Desktop/Screenshot 1.png", 1, "screenshot"));
    assert.equal(
      nfdHome.get("SELECT body FROM fts WHERE rowid = (SELECT id FROM segments WHERE file = ?)", shot)?.body,
      "Desktop",
    );
    const record = store.files([home])[0];
    assert.deepEqual(record, {
      id,
      path: `${home}/Downloads/Invoices/ﬁle 2041.PDF`,
      kind: "pdf",
      size: 10,
      mtime: 1,
      inode: 1,
      device: 1,
      state: "pending",
    });
    assert.equal(store.fileAt(record.path)?.id, id);
    assert.equal(store.fileAt("/nowhere"), null);
  });

  test("inode and device numbers past 2^53 come back exact, as DigUp keeps all 64 bits", () => {
    const store = freshStore();
    const big = 2n ** 60n + 1n; // an NTFS file id seen over SMB (sequence number in the top bits): no double holds it
    const nas = store.insert({ path: "/Volumes/nas/a.png", kind: "image", size: 1, mtime: 1, inode: big, device: -1 });
    // An unsigned id past 2^63 is kept as its bits, signed; a number past 2^53 (as the helper's JSON rounds one) as is.
    const rounded = store.insert({
      path: "/Volumes/nas/b.png",
      kind: "image",
      size: 1,
      mtime: 1,
      inode: 2n ** 64n - 2n,
      device: 2 ** 60,
    });
    const small = store.insert(file("/Volumes/nas/c.png", 7));
    assert.deepEqual(
      store.all("SELECT DISTINCT typeof(inode) AS i, typeof(device) AS d FROM files").map((row) => [row.i, row.d]),
      [["integer", "integer"]],
    );
    const ids = (records: Array<{ id: number; inode: FileNumber; device: FileNumber }>) =>
      records.map((r) => [r.id, r.inode, r.device]);
    const all = [
      [nas, big, -1],
      [rounded, -2, 2 ** 60],
      [small, 7, 1],
    ];
    assert.deepEqual(ids(store.files(["/Volumes/nas"])), all);
    assert.deepEqual(ids(store.pending()), all);
    assert.deepEqual(ids(store.pending(null, [nas])), [all[0]]);
    assert.deepEqual(ids([store.fileAt("/Volumes/nas/a.png")!]), [all[0]]);
    store.finish(rounded, "partial", null, { read_to: "30", read_end: "60" });
    assert.deepEqual(ids(store.unfinished()), [all[1]]);
    // One form per integer: what the helper reported matches what was stored from it, by === and by DigUp's
    // "device:inode" key for moves.
    const record = store.fileAt("/Volumes/nas/b.png")!;
    assert.equal(`${record.device}:${record.inode}`, `${2 ** 60}:-2`);
    assert.equal(fileNumber(2n ** 60n), 2 ** 60);
    assert.equal(fileNumber(big), big);
    assert.equal(fileNumber(-5n), -5);
    const unsigned = 2n ** 63n + 5n;
    store.requeue(nas, { path: "/Volumes/nas/a.png", kind: "image", size: 2, mtime: 2, inode: unsigned, device: 5 });
    assert.deepEqual(ids([store.fileAt("/Volumes/nas/a.png")!]), [[nas, BigInt.asIntN(64, unsigned), 5]]);
    // A number past 2^63 is stored as an integer, not a REAL.
    const top = store.insert({
      path: "/Volumes/nas/d.png",
      kind: "image",
      size: 1,
      mtime: 1,
      inode: 2 ** 63,
      device: 1,
    });
    assert.equal(store.get("SELECT typeof(inode) AS t FROM files WHERE id = ?", top)?.t, "integer");
    assert.equal(store.fileAt("/Volumes/nas/d.png")!.inode, -(2 ** 63));
  });

  test("list: files by state and kind, by path, in scope", () => {
    const store = freshStore();
    const svg = store.insert(file("/a/chart.svg", 1));
    store.finish(svg, "skipped", "small image 0×0");
    const scan = store.insert(file("/a/scan.pdf", 2, "pdf"));
    store.finish(scan, "failed", "It took more than 15 minutes to read");
    const away = store.insert(file("/drive/old.pdf", 3, "pdf"));
    store.finish(away, "failed", "damaged");
    store.insert(file("/a/new.png", 4));
    assert.deepEqual(store.list({ states: ["failed", "skipped"] }), [
      { path: "/a/chart.svg", kind: "image", state: "skipped", detail: "small image 0×0" },
      { path: "/a/scan.pdf", kind: "pdf", state: "failed", detail: "It took more than 15 minutes to read" },
      { path: "/drive/old.pdf", kind: "pdf", state: "failed", detail: "damaged" },
    ]);
    assert.deepEqual(
      store.list({ states: ["failed"], kinds: ["pdf"], limit: 1 }).map((item) => item.path),
      ["/a/scan.pdf"],
    );
    assert.deepEqual(
      store.list().map((item) => item.path),
      ["/a/chart.svg", "/a/new.png", "/a/scan.pdf", "/drive/old.pdf"],
    );
    assert.deepEqual(store.list({ states: [] }), []);
    store.scope = ["/a"];
    assert.deepEqual(
      store.list({ states: ["failed"] }).map((item) => item.path),
      ["/a/scan.pdf"],
    );
  });

  test("prune keeps only the chosen folders (DigUp: pruneKeepsOnlyChosenFolders)", () => {
    const store = freshStore();
    store.insert(file("/a/x.png", 1));
    store.insert(file("/a/sub/y.png", 2));
    store.insert(file("/ab/z.png", 3)); // a sibling whose name starts like "/a", not inside it
    store.insert(file("/b/w.png", 4));
    assert.equal(store.prune(["/a"]), 2);
    assert.equal(store.files(["/a"]).length, 2);
    assert.equal(store.files(["/ab", "/b"]).length, 0);
    assert.equal(count(store, "SELECT COUNT(*) AS n FROM fts"), 2); // the pruned files' names left keyword search too
    assert.equal(store.prune([]), 2);
  });

  test("files under a folder inside another listed one come once", () => {
    const store = freshStore();
    store.insert(file("/a/x.png", 1));
    store.insert(file("/a/sub/y.png", 2));
    assert.equal(store.files(["/a", "/a/sub"]).length, 2);
    assert.equal(store.files(["/a/sub"]).length, 1);
  });

  test("scope limits what is waiting (DigUp: scopeLimitsWhatIsWaiting)", () => {
    const store = freshStore();
    store.insert(file("/a/x.png", 1));
    store.insert(file("/drive/y.png", 2)); // on a drive that's unplugged
    store.scope = ["/a"];
    assert.equal(store.pendingCount(), 1);
    assert.deepEqual(
      store.pending().map((f) => f.path),
      ["/a/x.png"],
    );
    assert.equal(store.counts().byKindAndState.image?.pending, 1);
    store.scope = [];
    assert.equal(store.pendingCount(), 0);
    store.scope = null;
    assert.equal(store.pendingCount(), 2);
  });

  test("a file the helper stopped on is not read again (DigUp: aFileTheHelperStoppedOnIsNotReadAgain)", () => {
    const store = freshStore();
    store.insert(file("/a/stuck.pdf", 1, "pdf"));
    const book = store.insert(file("/a/book.pdf", 2, "pdf"));
    store.finish(book, "partial", null, { read_to: "30", read_end: "463" });
    assert.ok(store.markStopped("/a/stuck.pdf", "took more than 15 minutes to read"));
    assert.ok(store.markStopped("/a/book.pdf", "took more than 15 minutes to read"));
    assert.ok(!store.markStopped("/a/gone.pdf", "took more than 15 minutes to read"));
    assert.equal(store.pendingCount(), 0);
    assert.equal(store.unfinishedCount().files, 0); // the book keeps its first pages and isn't finished again
    const states = Object.fromEntries(store.files(["/a"]).map((f) => [f.path, f.state]));
    assert.deepEqual(states, { "/a/stuck.pdf": "failed", "/a/book.pdf": "done" });
    const details = store.all("SELECT path, detail FROM files ORDER BY path").map((row) => row.detail);
    assert.deepEqual(details, [
      "The rest couldn't be read: it took more than 15 minutes to read",
      "It took more than 15 minutes to read",
    ]);
  });

  test("rows of a folder spelled another way are found (DigUp: syncFindsTheRowsOfAFolderSpelledAnotherWay)", () => {
    // The walk stores paths as the disk spells them: under /private/var, and with names the disk keeps precomposed.
    // Folders are chosen spelled otherwise: under /var (the temporary folder) and decomposed.
    const base = mkdtempSync(join(tmpdir(), "dig-up-spelling-"));
    after(() => rmSync(base, { recursive: true, force: true }));
    const real = realpathSync.native(base);
    assert.notEqual(real, base, "the temporary folder should be under /var, a link to /private/var");
    const store = freshStore();
    const chosen: string[] = [];
    let inode = 1;
    for (const name of ["내 드라이브", "Café"]) {
      const onDisk = join(real, name.normalize("NFC"));
      mkdirSync(onDisk);
      writeFileSync(join(onDisk, "notes.txt"), "notes from the trip");
      store.insert(file(join(onDisk, "notes.txt"), inode++, "doc"));
      chosen.push(join(base, name.normalize("NFD")));
    }
    assert.equal(store.files(chosen).length, 2);
    store.scope = chosen;
    assert.equal(store.pendingCount(), 2);
    assert.equal(store.prune(chosen), 0);
  });

  test("prune compares paths as Swift does, also for a folder that isn't there to resolve", () => {
    const store = freshStore();
    store.insert(file("/nowhere-dig-up/Caf\u00e9/a.png", 1));
    store.insert(file("/nowhere-dig-up/Other/b.png", 2));
    assert.equal(store.prune(["/nowhere-dig-up/Cafe\u0301"]), 1);
    assert.deepEqual(
      store.all("SELECT path FROM files").map((row) => row.path),
      ["/nowhere-dig-up/Caf\u00e9/a.png"],
    );
  });

  test("requeue drops what was extracted and queues the file again", () => {
    const store = freshStore();
    const id = store.insert(file("/a/x.png", 1));
    store.addSegment({ file: id, kind: "image", modality: "image", vector: unit(0) });
    store.addSegment({ file: id, kind: "ocr", modality: "text", text: "Booking K7Q2LM" });
    store.finish(id, "done", null, { width: "800", height: "600" });
    store.requeue(id, { ...file("/a/x.png", 9, "screenshot"), size: 20, mtime: 5 });
    assert.equal(count(store, "SELECT COUNT(*) AS n FROM segments WHERE file = ?", id), 1); // the name stays
    assert.equal(count(store, "SELECT COUNT(*) AS n FROM fts"), 1);
    const row = store.get(
      "SELECT kind, size, mtime, inode, state, detail, info, indexed_at FROM files WHERE id = ?",
      id,
    );
    assert.deepEqual(
      { ...row },
      {
        kind: "screenshot",
        size: 20,
        mtime: 5,
        inode: 9,
        state: "pending",
        detail: null,
        info: null,
        indexed_at: null,
      },
    );
    // Read again as it is (a better way to read it arrived).
    store.addSegment({ file: id, kind: "ocr", modality: "text", text: "again" });
    store.finish(id, "failed", "It broke", { width: "800" });
    store.requeue(id);
    assert.equal(count(store, "SELECT COUNT(*) AS n FROM segments WHERE file = ?", id), 1);
    assert.deepEqual(
      { ...store.get("SELECT kind, inode, state, detail, info, indexed_at FROM files WHERE id = ?", id) },
      { kind: "screenshot", inode: 9, state: "pending", detail: null, info: null, indexed_at: null },
    );
  });

  test("move changes the path and the name's words, nothing else", () => {
    const store = freshStore({ home: "/Users/someone" });
    const id = store.insert(file("/Users/someone/Desktop/Screenshot 1.png", 1, "screenshot"));
    store.addSegment({ file: id, kind: "ocr", modality: "text", text: "receipt" });
    store.move(id, "/Users/someone/Projects/Receipts/hardware store.png");
    assert.equal(store.files(["/Users/someone/Projects"])[0]?.id, id);
    assert.equal(count(store, "SELECT COUNT(*) AS n FROM segments WHERE file = ?", id), 2);
    const name = store.get("SELECT name, body FROM fts JOIN segments s ON s.id = fts.rowid WHERE s.kind = 'name'");
    assert.deepEqual({ ...name }, { name: "hardware store.png", body: "Projects Receipts" });
    assert.equal(count(store, "SELECT COUNT(*) AS n FROM fts WHERE fts MATCH 'desktop'"), 0);
  });

  test("delete removes the keyword rows first, then the file and its segments", () => {
    const store = freshStore();
    const id = store.insert(file("/a/x.pdf", 1, "pdf"));
    store.addSegment({ file: id, kind: "page", modality: "text", loc: 1, text: "page one", vector: unit(1) });
    const other = store.insert(file("/a/y.pdf", 2, "pdf"));
    store.delete(id);
    assert.equal(count(store, "SELECT COUNT(*) AS n FROM segments WHERE file = ?", id), 0);
    assert.equal(count(store, "SELECT COUNT(*) AS n FROM fts"), 1);
    assert.deepEqual(
      store.files(["/a"]).map((f) => f.id),
      [other],
    );
  });

  test("resetAll queues everything again and keeps names (DigUp: resetAll)", () => {
    const store = freshStore();
    const id = store.insert(file("/a/invoice.pdf", 1, "pdf"));
    store.addSegment({ file: id, kind: "page", modality: "text", loc: 1, text: "total due", vector: unit(2) });
    store.finish(id, "done", null, { pages: "1" });
    store.setModel("source | photo140", "source");
    store.resetAll();
    assert.equal(store.fingerprint(), null);
    assert.equal(store.vectorSource(), "source");
    assert.deepEqual(
      store.all("SELECT kind FROM segments").map((row) => row.kind),
      ["name"],
    );
    assert.equal(count(store, "SELECT COUNT(*) AS n FROM fts WHERE fts MATCH 'invoice'"), 1);
    assert.equal(count(store, "SELECT COUNT(*) AS n FROM fts WHERE fts MATCH 'total'"), 0);
    assert.deepEqual(
      { ...store.get("SELECT state, info FROM files WHERE id = ?", id) },
      { state: "pending", info: null },
    );
  });

  test("pending: screenshots first, then images, PDFs, docs, audio, video, code; newest first in a kind", () => {
    const store = freshStore();
    const kinds: FileKind[] = ["code", "video", "audio", "doc", "pdf", "image", "screenshot"];
    let inode = 1;
    for (const kind of kinds) {
      for (const mtime of [10, 30, 20]) store.insert(file(`/a/${kind}-${mtime}`, inode++, kind, mtime));
    }
    const order = store.pending().map((f) => f.path.slice(3));
    assert.deepEqual(order.slice(0, 6), [
      "screenshot-30",
      "screenshot-20",
      "screenshot-10",
      "image-30",
      "image-20",
      "image-10",
    ]);
    assert.deepEqual(order.slice(-3), ["code-30", "code-20", "code-10"]);
    assert.equal(store.pending(2).length, 2);
    const some = store
      .files(["/a"])
      .filter((f) => f.path.endsWith("-10"))
      .map((f) => f.id);
    assert.deepEqual(
      store.pending(null, some).map((f) => f.path.slice(3)),
      kinds
        .slice()
        .reverse()
        .map((kind) => `${kind}-10`),
    );
    assert.deepEqual(store.pending(null, []), []);
    store.finish(store.files(["/a"])[0].id, "done");
    assert.equal(store.pendingCount(), 20);
  });

  test("long files: unfinished, how much is left, and the last place read", () => {
    const store = freshStore();
    const book = store.insert(file("/a/book.pdf", 1, "pdf", 5));
    const notes = store.insert(file("/a/notes.docx", 2, "doc", 9));
    const shot = store.insert(file("/a/shot.png", 3, "screenshot"));
    store.finish(book, "partial", "read to page 30", { pages: "463", read_to: "30", read_end: "463" });
    store.finish(notes, "partial", "read to chunk 40", { chunks: "40", read_to: "40", read_end: "52" });
    store.finish(shot, "done");
    const shrunk = store.insert(file("/a/shrunk.pdf", 4, "pdf", 1)); // read further than it now goes: none left
    store.finish(shrunk, "partial", "read to page 60", { pages: "50", read_to: "60", read_end: "50" });
    assert.deepEqual(
      store.unfinished().map((f) => f.id),
      [book, shrunk, notes],
    );
    assert.deepEqual(store.unfinishedCount(), { files: 3, left: 433 + 12 });
    assert.equal(store.lastPlace(book), null);
    store.addSegment({ file: book, kind: "page", modality: "text", loc: 29, text: "p" });
    store.addSegment({ file: book, kind: "page_image", modality: "image", loc: 30.9, vector: unit(3) });
    store.addSegment({ file: book, kind: "frame", modality: "image", loc: 99, vector: unit(4) }); // not a page
    assert.equal(store.lastPlace(book), 30);
    store.addSegment({ file: notes, kind: "chunk", modality: "text", loc: 41, text: "c" });
    assert.equal(store.lastPlace(notes), 41);
    const counts = store.counts();
    assert.equal(counts.unfinished, 3);
    assert.equal(counts.left, 445);
  });

  test("info is an object of strings, written with sorted keys", () => {
    const store = freshStore();
    const id = store.insert(file("/a/x.png", 1));
    const before = Date.now() / 1000;
    store.finish(id, "done", null, { width: "800", height: "600", taken: "2026:10:01 09:41:07" });
    const row = store.get("SELECT info, state, detail, indexed_at FROM files WHERE id = ?", id)!;
    assert.equal(row.info, '{"height":"600","taken":"2026:10:01 09:41:07","width":"800"}');
    assert.ok(Number(row.indexed_at) >= before - 1);
    assert.deepEqual(store.info(id), { height: "600", taken: "2026:10:01 09:41:07", width: "800" });
    store.setState(id, "skipped", "small image 160×160");
    assert.deepEqual(
      { ...store.get("SELECT info, state, detail FROM files WHERE id = ?", id) },
      {
        info: null,
        state: "skipped",
        detail: "small image 160×160",
      },
    );
    store.setInfo(id, { pages: "3" });
    assert.deepEqual(store.info(id), { pages: "3" });
    // Anything but strings reads as nothing, as Swift's `as? [String: String]` does.
    store.run("UPDATE files SET info = ? WHERE id = ?", '{"pages":3,"width":"800"}', id);
    assert.deepEqual(store.info(id), {});
    assert.deepEqual(parseInfo("not json"), {});
    assert.deepEqual(parseInfo("[1]"), {});
    assert.equal(infoJSON({}), null);
  });

  test("pictures that couldn't be read are read once more (DigUp: picturesThatCouldntBeReadAreReadOnceMore)", () => {
    const store = freshStore();
    const svg = store.insert(file("/a/chart.svg", 1));
    store.finish(svg, "skipped", "small image 0×0");
    const icon = store.insert(file("/a/icon.png", 2));
    store.finish(icon, "skipped", "small image 160×160"); // small, and rightly skipped
    const scan = store.insert(file("/a/scan.pdf", 3, "pdf"));
    store.addSegment({ file: scan, kind: "page_image", modality: "image", loc: 1, vector: unit(5) });
    store.finish(scan, "done");
    assert.equal(store.readAgainOnce({ ocr: false, drawsVectorPictures: true }), 1);
    assert.deepEqual(
      store.pending().map((f) => f.path),
      ["/a/chart.svg"],
    );
    assert.equal(store.readAgainOnce({ ocr: false, drawsVectorPictures: true }), 0);
    assert.equal(store.readAgainOnce({ ocr: true, drawsVectorPictures: true }), 1);
    assert.equal(store.meta("scans_ocr"), "1");
    assert.equal(store.get("SELECT state FROM files WHERE id = ?", scan)?.state, "pending");
    // Read again with OCR, it's done: once per index.
    store.addSegment({ file: scan, kind: "page_image", modality: "image", loc: 1, vector: unit(5) });
    store.finish(scan, "done");
    assert.equal(store.readAgainOnce({ ocr: true, drawsVectorPictures: false }), 0);
    assert.equal(store.get("SELECT state FROM files WHERE id = ?", scan)?.state, "done");
  });
});

describe("segments", () => {
  test("keyword text is normalized; the original is kept only when that changed it", () => {
    const store = freshStore();
    const id = store.insert(file("/notes/trip.txt", 1, "doc"));
    const plain = store.addSegment({ file: id, kind: "chunk", modality: "text", loc: 1, text: "plain words" });
    const arabic = store.addSegment({ file: id, kind: "chunk", modality: "text", loc: 2, text: "الْمَكْتَبَةَ" });
    const row = (segment: number) => ({
      ...store.get("SELECT name, body, original FROM fts WHERE rowid = ?", segment),
    });
    assert.deepEqual(row(plain), { name: "", body: "plain words", original: null });
    assert.deepEqual(row(arabic), { name: "", body: "المكتبة", original: "الْمَكْتَبَةَ" });
    // Swift's `==` is canonical: decomposed text (as macOS and PDFs often write it) that normalizing only composed is
    // the same text, kept once.
    const czech = "Kontaktní osoba je paní Černá z odboru školství.";
    const decomposed = store.addSegment({
      file: id,
      kind: "chunk",
      modality: "text",
      loc: 3,
      text: czech.normalize("NFD"),
    });
    assert.deepEqual(row(decomposed), { name: "", body: czech, original: null });
    assert.deepEqual(Store.keywordText("\u212Aelvin"), ["Kelvin", null]); // the Kelvin sign is K, canonically
    assert.deepEqual(Store.keywordText("\uFB01le"), ["file", "\uFB01le"]); // a ligature only compatibly
  });

  test("no keyword row without text; no vector means modality none; vectors are 1,536 bytes", () => {
    const store = freshStore();
    const id = store.insert(file("/a/clip.mov", 1, "video"));
    const frame = store.addSegment({ file: id, kind: "frame", modality: "image", loc: 3, locEnd: 6, vector: unit(0) });
    const empty = store.addSegment({ file: id, kind: "ocr", modality: "text", text: "", excerpt: "shown" });
    const segment = (segment: number) =>
      store.get(
        "SELECT kind, modality, loc, loc_end, excerpt, length(vec) AS bytes FROM segments WHERE id = ?",
        segment,
      );
    assert.deepEqual(
      { ...segment(frame) },
      { kind: "frame", modality: "image", loc: 3, loc_end: 6, excerpt: null, bytes: 1536 },
    );
    assert.deepEqual(
      { ...segment(empty) },
      { kind: "ocr", modality: "none", loc: null, loc_end: null, excerpt: "shown", bytes: null },
    );
    assert.equal(count(store, "SELECT COUNT(*) AS n FROM fts WHERE rowid IN (?, ?)", frame, empty), 0);
  });

  test("counts by kind and state, segments and vectors, in scope", () => {
    const store = freshStore();
    const a = store.insert(file("/a/x.png", 1));
    const b = store.insert(file("/b/y.png", 2));
    store.insert(file("/b/z.pdf", 3, "pdf"));
    store.addSegment({ file: a, kind: "image", modality: "image", vector: unit(0) });
    store.addSegment({ file: b, kind: "image", modality: "image", vector: unit(1) });
    store.addSegment({ file: b, kind: "ocr", modality: "text", text: "words" });
    store.finish(a, "done");
    let counts = store.counts();
    assert.deepEqual(counts.byKindAndState, { image: { done: 1, pending: 1 }, pdf: { pending: 1 } });
    assert.deepEqual([counts.segments, counts.vectors], [3, 2]);
    store.scope = ["/b"];
    counts = store.counts();
    assert.deepEqual(counts.byKindAndState, { image: { pending: 1 }, pdf: { pending: 1 } });
    assert.deepEqual([counts.segments, counts.vectors], [2, 1]);
  });
});
