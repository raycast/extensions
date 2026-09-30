const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
const Module = require("node:module");
const sourcePath = path.resolve(__dirname, "../src/search.ts");
const compiled = new Module(sourcePath, module);
compiled.filename = sourcePath;
compiled.paths = module.paths;
compiled._compile(
  ts.transpile(require("node:fs").readFileSync(sourcePath, "utf8"), {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2021,
  }),
  sourcePath
);
const { searchCondition, findSearchIndexes, normalizeSearchText, indexSignature, DEDUPE_ENTITIES_SQL } =
  compiled.exports;

test("searches full content, combines terms, and treats SQL characters literally", async () => {
  const SQL = await require("sql.js")();
  const db = new SQL.Database();
  try {
    db.run("CREATE TABLE Entities (Title TEXT, Content TEXT, ParentGOID TEXT, SearchText TEXT)");
    const insert = (title, content, parent) =>
      db.run("INSERT INTO Entities VALUES (?, ?, ?, ?)", [
        title,
        content,
        parent,
        normalizeSearchText(`${title}\n${content}`),
      ]);
    insert("Other title", "x".repeat(1200) + " Needle O'Brien 100%", "parent");
    insert("Needle", "unrelated", "other");
    const query = (text) =>
      db.exec(`SELECT substr(Content, 1, 1000) FROM Entities WHERE ParentGOID = 'parent' ${searchCondition(text)}`);
    assert.equal(query("needle O'Brien")[0].values.length, 1);
    assert.equal(query("100%")[0].values.length, 1);
    assert.equal(query("absent").length, 0);
    assert.equal(query("' OR 1=1 --").length, 0);
    assert.equal(query("   ")[0].values.length, 1);
  } finally {
    db.close();
  }
});

test("matches differently cased accented letters in titles and content", async () => {
  const SQL = await require("sql.js")();
  const db = new SQL.Database();
  try {
    db.run("CREATE TABLE Entities (Title TEXT, Content TEXT, SearchText TEXT)");
    for (const [title, content] of [
      ["\u00c9cole", "plain"],
      ["plain", "Caf\u00c9 au lait"],
      ["Cafe\u0301 decomposed", "plain"],
    ]) {
      db.run("INSERT INTO Entities VALUES (?, ?, ?)", [title, content, normalizeSearchText(`${title}\n${content}`)]);
    }
    const count = (text) =>
      db.exec(`SELECT 1 FROM Entities WHERE 1 = 1 ${searchCondition(text)}`)[0]?.values.length ?? 0;
    assert.equal(count("\u00e9cole"), 1);
    assert.equal(count("\u00c9COLE"), 1);
    assert.equal(count("caf\u00e9"), 2);
  } finally {
    db.close();
  }
});

test("keeps one copy per note, preferring the newest, and ties go to the newest index", async () => {
  const SQL = await require("sql.js")();
  const db = new SQL.Database();
  try {
    db.run("CREATE TABLE Entities (GOID TEXT, LastModifiedTime INTEGER, Content TEXT)");
    for (const row of [
      ["a", 1, "a old"],
      ["b", 5, "b newer content in older index"],
      ["c", 3, "c old index"],
      ["a", 2, "a new"],
      ["b", 4, "b older content in newer index"],
      ["c", 3, "c new index"],
    ]) {
      db.run("INSERT INTO Entities VALUES (?, ?, ?)", row);
    }
    db.run(DEDUPE_ENTITIES_SQL);
    const rows = db.exec("SELECT GOID, Content FROM Entities ORDER BY GOID")[0].values;
    assert.deepEqual(rows, [
      ["a", "a new"],
      ["b", "b newer content in older index"],
      ["c", "c new index"],
    ]);
  } finally {
    db.close();
  }
});

test("index signature changes when an older index is added or an index is removed", () => {
  const current = { path: "/n/16.0/FullTextSearchIndex/a.db", mtimeMs: 200 };
  const older = { path: "/n/15.0/FullTextSearchIndex/a.db", mtimeMs: 100 };
  const before = indexSignature([current]);
  assert.equal(indexSignature([current]), before);
  assert.equal(indexSignature([older, current]), indexSignature([current, older]));
  assert.notEqual(indexSignature([current, older]), before);
  assert.notEqual(indexSignature([older]), before);
  assert.notEqual(indexSignature([{ ...current, mtimeMs: 300 }]), before);
});

test("discovers named and UUID containers across OneNote versions", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "onenote-test-"));
  try {
    const expected = [];
    for (const [container, version] of [
      ["com.microsoft.onenote.mac", "15.0"],
      ["12345678-1234-1234-1234-123456789abc", "16.0"],
    ]) {
      const index = path.join(
        home,
        "Library/Containers",
        container,
        "Data/Library/Application Support/Microsoft User Data/OneNote",
        version,
        "FullTextSearchIndex"
      );
      await fs.mkdir(index, { recursive: true });
      await fs.writeFile(path.join(index, "account.db"), "");
      expected.push(index);
    }
    assert.deepEqual((await findSearchIndexes(home)).sort(), expected.sort());
  } finally {
    await fs.rm(home, { recursive: true, force: true });
  }
});

test("missing indexes explain synchronization instead of claiming the app is absent", async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), "onenote-test-"));
  try {
    await assert.rejects(findSearchIndexes(home), /sync your notebooks/);
  } finally {
    await fs.rm(home, { recursive: true, force: true });
  }
});
