import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, test } from "node:test";
import { loadSources } from "./helpers.mjs";

const load = loadSources();
const {
  cacheStats,
  clearLibraryCache,
  discoverContainer,
  isCancellation,
  loadLibrary,
  queryDatabase,
  queryChapters,
  queryBookmarks,
  readPublications,
} = load("library");
let root;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "jw-library-fixture-"));
  clearLibraryCache();
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function database(sql = "CREATE TABLE Test (value TEXT); INSERT INTO Test VALUES ('first');") {
  const path = join(root, "test.db");
  execFileSync("/usr/bin/sqlite3", [path, sql]);
  return path;
}

function publication(
  container,
  name = "rr_X",
  manifest = { publication: { title: "Book", symbol: "rr", fileName: "rr_X.db", language: 2 } },
) {
  const path = join(root, container, "Data", "Library", "Publications", name);
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, "manifest.json"), JSON.stringify(manifest));
  return path;
}

test("auto-discovery ignores unrelated publications folders", async () => {
  publication("unrelated-app");
  publication("org.jw.jwlibrary");
  assert.equal(await discoverContainer(undefined, root), join(root, "org.jw.jwlibrary"));
});

test("UUID containers are identified using OS metadata", async () => {
  publication("UUID");
  writeFileSync(
    join(root, "UUID", ".com.apple.containermanagerd.metadata.plist"),
    '<?xml version="1.0"?><plist version="1.0"><dict><key>MCMMetadataIdentifier</key><string>org.jw.jwlibrary</string></dict></plist>',
  );
  assert.equal(await discoverContainer(undefined, root), join(root, "UUID"));
});

test("the app preference marker identifies a UUID when system metadata is unreadable", async () => {
  publication("UUID");
  const preferences = join(root, "UUID", "Data", "Library", "Preferences");
  mkdirSync(preferences, { recursive: true });
  writeFileSync(join(preferences, "org.jw.jwlibrary.plist"), "Contents need not be read");
  writeFileSync(join(root, "UUID", ".com.apple.containermanagerd.metadata.plist"), "unreadable metadata");
  assert.equal(await discoverContainer(undefined, root), join(root, "UUID"));
});

test("a bad unrelated metadata file does not hide an identifiable JW Library container", async () => {
  publication("other");
  publication("org.jw.jwlibrary");
  writeFileSync(join(root, "other", ".com.apple.containermanagerd.metadata.plist"), "invalid");
  assert.equal(await discoverContainer(undefined, root), join(root, "org.jw.jwlibrary"));
});

test("ambiguous containers require an explicit choice", async () => {
  publication("org.jw.jwlibrary");
  publication("org.jw.jwlibrary.mobile");
  await assert.rejects(discoverContainer(undefined, root), (error) => error.code === "ambiguous-container");
  assert.equal(await discoverContainer("org.jw.jwlibrary", root), join(root, "org.jw.jwlibrary"));
});

test("invalid, missing, and nonexistent container roots are handled explicitly", async () => {
  await assert.rejects(discoverContainer("../other", root), (error) => error.code === "configuration");
  await assert.rejects(discoverContainer("missing", root), (error) => error.code === "configuration");
  assert.equal(await discoverContainer(undefined, join(root, "missing")), null);
});

test("publications and bookmarks never come from different containers", async () => {
  publication("org.jw.jwlibrary");
  mkdirSync(join(root, "unrelated", "Data", "Documents", "UserData"), { recursive: true });
  writeFileSync(join(root, "unrelated", "Data", "Documents", "UserData", "userdata.db"), "not used");
  const library = await loadLibrary(undefined, undefined, root);
  assert.equal(library.publications.length, 1);
  assert.equal(library.bookmarksDbPath, null);
});

test("malformed and incomplete manifests are reported without hiding valid books", async () => {
  const good = publication("org.jw.jwlibrary");
  const bad = publication("org.jw.jwlibrary", "bad_X", {});
  writeFileSync(join(bad, "manifest.json"), "{unfinished");
  const result = await readPublications(join(good, ".."));
  assert.equal(result.publications.length, 1);
  assert.equal(result.skipped, 1);
});

test("publication titles use plain metadata and filenames cannot escape their folder", async () => {
  const folder = publication("org.jw.jwlibrary", "w_X_202601", {
    publication: {
      title: "Watchtower",
      symbol: "w26",
      fileName: "../../outside.db",
      publicationType: "Watchtower",
      issueProperties: { title: "Plain &amp; title", titleRich: "<b>Wrong rich title</b>", coverTitle: "Subtitle" },
    },
  });
  const { publications } = await readPublications(join(folder, ".."));
  assert.equal(publications[0].name, "Plain & title: Subtitle");
  assert.equal(publications[0].fileName, "outside.db");
});

test("oversized manifests are skipped with a warning instead of being loaded", async () => {
  const folder = publication("org.jw.jwlibrary");
  writeFileSync(join(folder, "manifest.json"), " ".repeat(1024 * 1024 + 1));
  const result = await readPublications(join(folder, ".."));
  assert.equal(result.publications.length, 0);
  assert.equal(result.skipped, 1);
});

test("a genuinely empty query differs from missing, corrupt, and incompatible databases", async () => {
  const db = database();
  assert.deepEqual(await queryDatabase(db, "SELECT * FROM Test WHERE 0;"), []);
  await assert.rejects(queryDatabase(join(root, "missing.db"), "SELECT 1;"), (error) => error.code === "missing");
  await assert.rejects(queryDatabase(db, "SELECT * FROM Absent;"), (error) => error.code === "schema");
  const corrupt = join(root, "corrupt.db");
  writeFileSync(corrupt, "not SQLite");
  await assert.rejects(queryDatabase(corrupt, "SELECT * FROM Test;"), (error) => error.code === "invalid-data");
});

test("database access is read-only", async () => {
  const db = database();
  await assert.rejects(queryDatabase(db, "INSERT INTO Test VALUES ('unauthorized');"));
  assert.deepEqual(await queryDatabase(db, "SELECT value FROM Test;"), [{ value: "first" }]);
});

test("cached results invalidate when the source changes, and refresh clears cached metadata", async () => {
  const db = database();
  assert.equal((await queryDatabase(db, "SELECT value FROM Test;")).length, 1);
  execFileSync("/usr/bin/sqlite3", [db, "INSERT INTO Test VALUES ('second');"]);
  assert.equal((await queryDatabase(db, "SELECT value FROM Test;")).length, 2);
  clearLibraryCache();
  assert.equal(cacheStats().entries, 0);
});

test("cache invalidation includes changes held in a live WAL file", async () => {
  const db = database();
  const writer = spawn("/usr/bin/sqlite3", [db]);
  function waitFor(marker) {
    return new Promise((resolve, reject) => {
      let output = "";
      const timer = setTimeout(() => {
        writer.stdout.off("data", onData);
        reject(new Error("SQLite fixture timed out"));
      }, 2000);
      function onData(chunk) {
        output += chunk;
        if (output.includes(marker)) {
          clearTimeout(timer);
          writer.stdout.off("data", onData);
          resolve();
        }
      }
      writer.stdout.on("data", onData);
    });
  }
  try {
    const ready = waitFor("ready");
    writer.stdin.write(
      "PRAGMA journal_mode=WAL;\nINSERT INTO Test VALUES ('setup');\nDELETE FROM Test WHERE value='setup';\n.print ready\n",
    );
    await ready;
    assert.equal((await queryDatabase(db, "SELECT value FROM Test;")).length, 1);
    const updated = waitFor("updated");
    writer.stdin.write("INSERT INTO Test VALUES ('from WAL');\n.print updated\n");
    await updated;
    assert.equal((await queryDatabase(db, "SELECT value FROM Test;")).length, 2);
  } finally {
    if (writer.exitCode === null && writer.signalCode === null) {
      const exited = once(writer, "exit");
      writer.kill();
      await exited;
    }
  }
});

test("query output and cache growth have explicit bounds", async () => {
  const db = database();
  await assert.rejects(
    queryDatabase(db, "SELECT printf('%1000s','x') AS value;", { maxBufferBytes: 64 }),
    (error) => error.code === "too-large",
  );
  for (let n = 0; n < 20; n++) await queryDatabase(db, `SELECT ${n} AS value;`);
  assert.ok(cacheStats().entries <= 12);
  assert.ok(cacheStats().bytes <= 8 * 1024 * 1024);
});

test("long-running queries time out and cancelled searches are recognized", async () => {
  const db = database();
  const slow =
    "WITH RECURSIVE x(n) AS (VALUES(1) UNION ALL SELECT n+1 FROM x WHERE n<1000000000) SELECT sum(n) FROM x;";
  await assert.rejects(queryDatabase(db, slow, { timeoutMs: 20 }), (error) => error.code === "timeout");
  const controller = new AbortController();
  const pending = queryDatabase(db, slow, { signal: controller.signal });
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(pending, isCancellation);
});

test("locked databases produce a retryable busy error", async () => {
  const db = database();
  const locker = spawn("/usr/bin/sqlite3", [db]);
  try {
    const ready = once(locker.stdout, "data", { signal: AbortSignal.timeout(2000) });
    locker.stdin.write("BEGIN EXCLUSIVE;\n.print ready\n");
    await ready;
    await assert.rejects(
      queryDatabase(db, "SELECT * FROM Test;", { busyTimeoutMs: 30 }),
      (error) => error.code === "busy",
    );
  } finally {
    if (locker.exitCode === null && locker.signalCode === null) {
      const exited = once(locker, "exit");
      locker.kill();
      await exited;
    }
  }
});

test("actual chapter and bookmark SELECT statements run against synthetic schemas", async () => {
  const folder = publication("org.jw.jwlibrary");
  const db = join(folder, "rr_X.db");
  execFileSync("/usr/bin/sqlite3", [
    db,
    "CREATE TABLE Document(DocumentId INTEGER, MepsDocumentId INTEGER, ChapterNumber INTEGER, Title TEXT, Class INTEGER); INSERT INTO Document VALUES(7,1102017163,3,'Chapter three',1);",
  ]);
  const chapters = await queryChapters(join(folder, ".."), { folderName: "rr_X", fileName: "rr_X.db" });
  assert.equal(chapters[0].chapterNumber, 3);
  const bookmarks = join(root, "bookmarks.db");
  execFileSync("/usr/bin/sqlite3", [
    bookmarks,
    `CREATE TABLE Bookmark(BookmarkId INTEGER,Slot INTEGER,Title TEXT,Snippet TEXT,BlockType INTEGER,BlockIdentifier INTEGER,LocationId INTEGER,PublicationLocationId INTEGER);
    CREATE TABLE Location(LocationId INTEGER,BookNumber INTEGER,ChapterNumber INTEGER,DocumentId INTEGER,KeySymbol TEXT,MepsLanguage INTEGER,Type INTEGER);
    INSERT INTO Bookmark VALUES(1,0,'Sample',NULL,1,14,2,2);
    INSERT INTO Location VALUES(2,NULL,NULL,1102017163,'rr',2,0);`,
  ]);
  assert.equal((await queryBookmarks(bookmarks))[0].blockIdentifier, 14);
});
