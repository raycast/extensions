import { environment, Cache } from "@raycast/api";
import { execFile } from "child_process";
import { statSync, writeFileSync } from "fs";
import {
  DEDUPE_ENTITIES_SQL,
  findSearchIndexes,
  indexSignature,
  normalizeSearchText,
  BUILD_FULL_TEXT_INDEX_SQL,
  IndexFile,
} from "./search";
import { mkdtemp, readdir, readFile, rename, rm } from "fs/promises";
import { homedir } from "os";
import { resolve } from "path";
import { promisify } from "util";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";

let SQL: SqlJsStatic;

const execFileAsync = promisify(execFile);

export const ONENOTE_MERGED_DB = resolve(environment.supportPath, "merged-onenote-data.db");
const UNINDEXED_DB = resolve(environment.supportPath, "merged-onenote-data-unindexed.db");

export const create_or_update_db = async (force_update = false) => {
  if (!SQL) {
    SQL = await initSqlJs({ locateFile: () => resolve(environment.assetsPath, "sql-wasm.wasm") });
  }
  await cleanupInterruptedRebuilds();

  const ALL_DB: Database[] = [];
  const ALL_DB_NAMES: string[] = [];

  // Search for OneNote databases:
  const indexFiles: IndexFile[] = [];
  const indexPaths = await findSearchIndexes(homedir());
  for (const indexPath of indexPaths) {
    const db_files = await readdir(indexPath);
    for (const file of db_files) {
      if (file.endsWith(".db")) {
        const filepath = resolve(indexPath, file);
        indexFiles.push({ path: filepath, mtimeMs: statSync(filepath).mtimeMs });
      }
    }
  }
  // Oldest first, so that later copies of a note come from more recently updated indexes.
  indexFiles.sort((a, b) => a.mtimeMs - b.mtimeMs || a.path.localeCompare(b.path));
  const ALL_DB_PATHS = indexFiles.map((file) => file.path);
  const signature = indexSignature(indexFiles);

  if (ALL_DB_PATHS.length === 0) {
    throw new Error(
      "OneNote has no local search databases. Open OneNote, sign in, and sync your notebooks, then retry."
    );
  }

  if (!force_update) {
    const indexed = await readMergedDatabase(ONENOTE_MERGED_DB, signature, true);
    if (indexed) {
      indexed.close();
      return { databasePath: ONENOTE_MERGED_DB, fullTextIndexed: true };
    }
  }

  // A fallback database can be reused for an index retry without re-merging the source files.
  let db = force_update ? undefined : await readMergedDatabase(UNINDEXED_DB, signature, false);
  let temporaryDirectory: string | undefined;
  try {
    if (!db) {
      // Load OneNote databases:
      for (const db_file of ALL_DB_PATHS) {
        const file = await readFile(db_file);
        const db_t = new SQL.Database(file);
        ALL_DB.push(db_t);
        // TO RETRIEVE DBNAME :
        // (instead of db_t.filename: which works but raise error)
        const dbname = db_t.exec("select file from pragma_database_list where name='main';")[0].values[0][0];
        ALL_DB_NAMES.push(dbname as string);
      }

      // Create main database:
      db = new SQL.Database();
      db.exec(CREATE_TABLE_SQL);
      db.create_function("normalize_search_text", (text: unknown) => normalizeSearchText(String(text ?? "")));

      // Attach "official" OneNote databases:
      for (const index in ALL_DB_NAMES) {
        db.run(`ATTACH '${ALL_DB_NAMES[index]}' as db${index}`);
      }

      // Insert databases:
      for (const index in ALL_DB) {
        // POPULATE NOTES + FULL NOTE CONTENT:
        db.run(
          "INSERT INTO Entities (\
              Type, GOID, GUID, GOSID, ParentGOID, GrandparentGOIDs, \
              ContentRID, RootRevGenCount, LastModifiedTime, RecentTime, \
              PinTime, Color, Title, EnterpriseIdentity, Content)\
              SELECT E.Type, E.GOID, E.GUID, E.GOSID, E.ParentGOID, E.GrandparentGOIDs, \
              E.ContentRID, E.RootRevGenCount, E.LastModifiedTime, E.RecentTime, \
              E.PinTime, E.Color, E.Title, E.EnterpriseIdentity, \
              (select group_concat(text, '\n\n') FROM db" +
            index +
            ".PageElements as PE2 WHERE PE2.EntityRowId = E.rowid) \
              FROM db" +
            index +
            ".Entities as E;"
        );
      }

      // Needed by the de-duplication below and by note lookups.
      db.run("CREATE INDEX Entities_GOID ON Entities (GOID)");

      // The same note can exist in several indexes (e.g. old and current versions): keep the most recently
      // modified copy, preferring the one from the most recently updated index on ties.
      db.run(DEDUPE_ENTITIES_SQL);

      // One normalized title + content text per note; the trigram index is built over it after the file is saved.
      db.run(
        "UPDATE Entities SET SearchText = normalize_search_text(coalesce(Title, '') || char(10) || coalesce(Content, ''))"
      );
      db.exec(
        "CREATE INDEX Entities_ParentGOID_RecentTime ON Entities (ParentGOID, RecentTime DESC);\
     CREATE INDEX Entities_RecentTime ON Entities (RecentTime DESC);"
      );
      // The signature travels with the database instead of separate, racy LocalStorage writes.
      db.run("CREATE TABLE ExtensionMetadata (Signature TEXT NOT NULL)");
      db.run("INSERT INTO ExtensionMetadata VALUES (?)", [signature]);
    }

    const results = db.exec("SELECT DISTINCT GOID, Title FROM Entities WHERE Type > 1");

    // Build on a private file on the same filesystem; only a completed database is published.
    temporaryDirectory = await mkdtemp(resolve(environment.supportPath, `onenote-rebuild-${process.pid}-`));
    const temporaryDatabase = resolve(temporaryDirectory, "merged.db");
    writeFileSync(temporaryDatabase, Buffer.from(db.export()));
    for (const _db of ALL_DB) {
      _db.close();
    }
    ALL_DB.length = 0;
    db.close();
    db = undefined;

    const fullTextIndexed = await buildFullTextIndex(temporaryDatabase);
    // Keep indexed and fallback files separate so another invocation cannot remove the FTS table
    // from a path an already-open view is querying. Atomic rename also survives interrupted builds.
    const databasePath = fullTextIndexed ? ONENOTE_MERGED_DB : UNINDEXED_DB;
    await rename(temporaryDatabase, databasePath);
    const cache = new Cache();
    cache.clear();
    for (const result of results[0]?.values ?? []) {
      cache.set(result[0] as string, result[1] as string);
    }
    return { databasePath, fullTextIndexed };
  } finally {
    for (const source of ALL_DB) source.close();
    db?.close();
    if (temporaryDirectory) await rm(temporaryDirectory, { recursive: true, force: true });
  }
};

async function cleanupInterruptedRebuilds() {
  for (const directory of await readdir(environment.supportPath, { withFileTypes: true })) {
    const owner = /^onenote-rebuild-(\d+)-/.exec(directory.name);
    if (!directory.isDirectory() || !owner) continue;
    try {
      process.kill(Number(owner[1]), 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ESRCH") {
        await rm(resolve(environment.supportPath, directory.name), { recursive: true, force: true });
      }
    }
  }
}

async function readMergedDatabase(path: string, signature: string, fullTextIndexed: boolean) {
  let buffer: Buffer;
  try {
    buffer = await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
  let db: Database | undefined;
  try {
    db = new SQL.Database(buffer);
    const savedSignature = db.exec("SELECT Signature FROM ExtensionMetadata")[0]?.values[0]?.[0];
    const hasIndex = db.exec("SELECT 1 FROM sqlite_master WHERE name = 'EntitiesFts'").length > 0;
    if (savedSignature === signature && (!fullTextIndexed || hasIndex)) return db;
  } catch {
    // Rebuild legacy or incomplete databases rather than trusting cached index state.
  }
  db?.close();
  return undefined;
}

// Runs out of process so the index is streamed to disk instead of held in memory. Falls back to unindexed search
// when the system SQLite lacks FTS5 or the trigram tokenizer.
async function buildFullTextIndex(databasePath: string) {
  try {
    await execFileAsync("sqlite3", [databasePath, BUILD_FULL_TEXT_INDEX_SQL]);
    return true;
  } catch (error) {
    console.warn("Could not build the full-text search index; falling back to unindexed search.", error);
    return false;
  }
}

const CREATE_TABLE_SQL =
  "DROP TABLE IF EXISTS Entities;\n" +
  "CREATE TABLE Entities (" +
  "Type                INTEGER, " +
  "GOID                NVARCHAR(50) NOT NULL, " +
  "GUID                NVARCHAR(38) NOT NULL, " +
  "GOSID               NVARCHAR(50), " +
  "ParentGOID          NVARCHAR(50), " +
  "GrandparentGOIDs    TEXT, " +
  "ContentRID          NVARCHAR(50), " +
  "RootRevGenCount     INTEGER, " +
  "LastModifiedTime    INTEGER, " +
  "RecentTime          INTEGER, " +
  "PinTime             INTEGER, " +
  "Color               INTEGER, " +
  "Title               TEXT, " +
  "EnterpriseIdentity  TEXT," +
  "Content             TEXT, " +
  "SearchText          TEXT" +
  "); ";
