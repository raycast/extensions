const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
    }).outputText,
    filename,
  );
const Module = require("node:module");
const originalLoad = Module._load;
Module._load = function (name, ...args) {
  return name === "@raycast/api" ? { environment: { assetsPath: "" } } : originalLoad.call(this, name, ...args);
};
const { BearDb } = require("../src/bear-db.ts");
Module._load = originalLoad;
(async () => {
  const SQL = await require("sql.js")();
  for (const version of [1, 2]) {
    const raw = new SQL.Database();
    const table = version === 2 ? "Z_5TAGS" : "Z_7TAGS";
    const noteKey = version === 2 ? "Z_5NOTES" : "Z_7NOTES";
    const tagKey = version === 2 ? "Z_13TAGS" : "Z_14TAGS";
    raw.run(`CREATE TABLE ZSFNOTE (Z_PK INTEGER PRIMARY KEY, ZUNIQUEIDENTIFIER TEXT, ZTITLE TEXT, ZTEXT TEXT, ZMODIFICATIONDATE REAL, ZCREATIONDATE REAL, ZENCRYPTED INTEGER, ZPINNED INTEGER, ZARCHIVED INTEGER, ZTRASHED INTEGER);
      CREATE TABLE ${table} (${noteKey} INTEGER, ${tagKey} INTEGER);
      CREATE TABLE ZSFNOTETAG (Z_PK INTEGER, ZTITLE TEXT);
      INSERT INTO ZSFNOTETAG VALUES (1, 'work'), (2, 'work/child');
      INSERT INTO ZSFNOTE VALUES (1,'a','Σ TEST','中文 body',20,10,0,0,0,0),(2,'b','other','σ test 中文',30,10,0,1,0,0),(3,'c','trashed','中文',40,10,0,0,0,1),(4,'d','locked',NULL,10,10,1,0,0,0);
      INSERT INTO ${table} VALUES (1,1),(1,2),(2,2);`);
    if (version === 2)
      raw.run(
        "CREATE TABLE ZSFNOTEBACKLINK (ZLINKEDBY INTEGER, ZLINKINGTO INTEGER); INSERT INTO ZSFNOTEBACKLINK VALUES (1,4)",
      );
    else
      raw.run(
        "CREATE TABLE Z_7LINKEDNOTES (Z_7LINKEDBYNOTES INTEGER, Z_7LINKEDNOTES INTEGER); INSERT INTO Z_7LINKEDNOTES VALUES (1,4)",
      );
    const db = new BearDb(raw);
    assert.deepEqual(
      db.getNotes("Σ test").map((n) => n.id),
      version === 2 ? ["b", "a"] : ["a", "b"],
    );
    assert.deepEqual(
      db.getNotes("中文", "work").map((n) => n.id),
      ["a"],
    );
    assert.deepEqual(
      db.getNotes("", "work/child").map((n) => n.id),
      ["b", "a"],
    );
    assert.equal(db.getNotes("no match").length, 0);
    const linked = db.getNoteLinks("a")[0];
    assert.equal(linked.id, "d");
    assert.equal(linked.encrypted, true, "linked notes must retain encrypted state");
    assert.ok(Number.isFinite(linked.createdAt.getTime()), "linked note creation date must be valid");
    assert.equal(db.getBacklinks("d")[0].id, "a");
    assert.equal(db.getNotes("").length, 3);
    assert.equal(db.getNotes("").find((n) => n.id === "d").encrypted, true);
    // Tag selection must happen before LIMIT, even when newer unmatched notes dominate.
    for (let i = 5; i < 35; i++)
      raw.run("INSERT INTO ZSFNOTE VALUES (?, ?, ?, ?, ?, 10, 0, 0, 0, 0)", [i, "extra" + i, "extra", "body", i + 100]);
    // Rebuild a fresh snapshot to include inserted fixture notes.
    const snapshot = raw.export();
    db.close();
    const expanded = new BearDb(new SQL.Database(snapshot));
    assert.deepEqual(
      expanded.getNotes("", "work").map((n) => n.id),
      ["a"],
    );
    assert.equal(expanded.getNotes("").length, 20);
    expanded.close();
  }
  console.log("Bear 1 and Bear 2 database regressions passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
