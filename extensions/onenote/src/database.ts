import { environment, LocalStorage, Cache } from "@raycast/api";
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
import { readdir, readFile } from "fs/promises";
import { homedir } from "os";
import { resolve } from "path";
import { promisify } from "util";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";

let SQL: SqlJsStatic;

const SIGNATURE_KEY = "onenote-db-signature";
const FULL_TEXT_INDEXED_KEY = "onenote-db-full-text-indexed";

const execFileAsync = promisify(execFile);

export const ONENOTE_MERGED_DB = resolve(environment.supportPath, "merged-onenote-data.db");

export const create_or_update_db = async (force_update = false) => {
  if (!SQL) {
    SQL = await initSqlJs({ locateFile: () => resolve(environment.assetsPath, "sql-wasm.wasm") });
  }

  const lastSignature = await LocalStorage.getItem<string>(SIGNATURE_KEY);
  let NEEDUPDATE = force_update;

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

  if (signature !== lastSignature) {
    NEEDUPDATE = true;
  }

  try {
    await readFile(ONENOTE_MERGED_DB);
  } catch (error) {
    NEEDUPDATE = true;
  }

  if (NEEDUPDATE == false) {
    return { fullTextIndexed: (await LocalStorage.getItem<boolean>(FULL_TEXT_INDEXED_KEY)) === true };
  }

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
  const db = new SQL.Database();
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

  // CACHING PARENTS' TITLE :
  const results = db.exec("SELECT DISTINCT GOID, Title FROM Entities WHERE Type > 1");
  const cache = new Cache();
  cache.clear();
  for (const result of results[0]?.values ?? []) {
    cache.set(result[0] as string, result[1] as string);
  }

  // WRITE DB TO FILE, then release the in-memory databases before SQLite builds the index on disk
  writeFileSync(ONENOTE_MERGED_DB, Buffer.from(db.export()));
  for (const _db of ALL_DB) {
    _db.close();
  }
  db.close();

  const fullTextIndexed = await buildFullTextIndex();
  await LocalStorage.setItem(FULL_TEXT_INDEXED_KEY, fullTextIndexed);
  await LocalStorage.setItem(SIGNATURE_KEY, signature);
  return { fullTextIndexed };
};

// Runs out of process so the index is streamed to disk instead of held in memory. Falls back to unindexed search
// when the system SQLite lacks FTS5 or the trigram tokenizer.
async function buildFullTextIndex() {
  try {
    await execFileAsync("sqlite3", [ONENOTE_MERGED_DB, BUILD_FULL_TEXT_INDEX_SQL]);
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
