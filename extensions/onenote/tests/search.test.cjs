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
const { searchCondition, findSearchIndexes } = compiled.exports;

test("searches full content, combines terms, and treats SQL characters literally", async () => {
  const SQL = await require("sql.js")();
  const db = new SQL.Database();
  try {
    db.run("CREATE TABLE Entities (Title TEXT, Content TEXT, ParentGOID TEXT)");
    db.run("INSERT INTO Entities VALUES (?, ?, ?)", [
      "Other title",
      "x".repeat(1200) + " Needle O'Brien 100%",
      "parent",
    ]);
    db.run("INSERT INTO Entities VALUES (?, ?, ?)", ["Needle", "unrelated", "other"]);
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
