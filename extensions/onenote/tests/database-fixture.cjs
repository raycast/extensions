const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const Module = require("node:module");
const ts = require("typescript");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");

const run = promisify(execFile);
const extensionPath = path.resolve(__dirname, "..");

function loadSource(name, mocks, extension = "ts") {
  const filename = path.join(extensionPath, "src", `${name}.${extension}`);
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = module.paths;
  const originalRequire = compiled.require.bind(compiled);
  compiled.require = (id) => (id in mocks ? mocks[id] : originalRequire(id));
  compiled._compile(
    ts.transpile(require("node:fs").readFileSync(filename, "utf8"), {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2021,
      jsx: ts.JsxEmit.ReactJSX,
    }),
    filename
  );
  return compiled.exports;
}

async function createFixture(options = {}) {
  const root = options.root ?? (await fs.mkdtemp(path.join(os.tmpdir(), "onenote-database-")));
  const home = path.join(root, "home");
  const support = path.join(root, "support");
  const index = path.join(
    home,
    "Library/Containers/com.microsoft.onenote.mac/Data/Library/Application Support/Microsoft User Data/OneNote/16.0/FullTextSearchIndex"
  );
  await fs.mkdir(index, { recursive: true });
  await fs.mkdir(support, { recursive: true });
  const indexFile = path.join(index, "synthetic.db");
  const SQL = await require("sql.js")();
  if (!options.root) {
    const db = new SQL.Database();
    try {
      db.run(`CREATE TABLE Entities (
        Type INTEGER, GOID TEXT, GUID TEXT, GOSID TEXT, ParentGOID TEXT, GrandparentGOIDs TEXT,
        ContentRID TEXT, RootRevGenCount INTEGER, LastModifiedTime INTEGER, RecentTime INTEGER,
        PinTime INTEGER, Color INTEGER, Title TEXT, EnterpriseIdentity TEXT
      ); CREATE TABLE PageElements (EntityRowId INTEGER, text TEXT);`);
      for (let i = 1; i <= (options.noteCount ?? 1); i++) {
        db.run(
          "INSERT INTO Entities (Type, GOID, GUID, ParentGOID, LastModifiedTime, RecentTime, Title) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [1, `synthetic-${i}`, `guid-${i}`, "synthetic-section", i, i, `Synthetic note ${i}`]
        );
        db.run("INSERT INTO PageElements VALUES (?, ?)", [
          i,
          "x".repeat(1200) + (options.contentSuffix ?? " needle photography"),
        ]);
      }
      await fs.writeFile(indexFile, Buffer.from(db.export()));
    } finally {
      db.close();
    }
  }

  const storage = new Map();
  let indexCalls = 0;
  const search = loadSource("search", {});
  const database = loadSource("database", {
    "./search": search,
    "@raycast/api": {
      environment: { supportPath: support, assetsPath: path.join(extensionPath, "assets") },
      LocalStorage: {
        getItem: async (key) => storage.get(key),
        setItem: async (key, value) => storage.set(key, value),
      },
      Cache: class {
        clear() {}
        set() {}
      },
    },
    os: { ...os, homedir: () => home },
    "fs/promises": { ...fs, ...options.filesystem },
    child_process: {
      execFile(command, args, callback) {
        const call = ++indexCalls;
        const execute = () => run(command, args);
        Promise.resolve()
          .then(() => (options.execute ? options.execute({ call, args, execute }) : execute()))
          .then((result) => callback(null, result?.stdout ?? "", result?.stderr ?? ""), callback);
      },
    },
  });

  return {
    ...database,
    search,
    root,
    home,
    support,
    indexFile,
    SQL,
    indexCalls: () => indexCalls,
    query: async (state, sql) =>
      (await run("sqlite3", [state.databasePath ?? database.ONENOTE_MERGED_DB, sql])).stdout.trim(),
    cleanup: () => fs.rm(root, { recursive: true, force: true }),
  };
}

module.exports = { createFixture, loadSource };
