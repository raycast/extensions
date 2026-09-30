import { environment, LocalStorage, Cache } from "@raycast/api";
import { statSync, writeFileSync } from "fs";
import {
  DEDUPE_ENTITIES_SQL,
  findSearchIndexes,
  indexSignature,
  normalizeSearchText,
  tokenizeSearchText,
  IndexFile,
} from "./search";
import { readdir, readFile } from "fs/promises";
import { homedir } from "os";
import { resolve } from "path";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";

let SQL: SqlJsStatic;

const SIGNATURE_KEY = "onenote-db-signature";

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

  if (NEEDUPDATE == false) return true;

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

  // Pre-normalized titles (substring search) and a word index of titles and content (indexed search).
  db.run("UPDATE Entities SET TitleSearch = normalize_search_text(coalesce(Title, ''))");
  db.run("BEGIN");
  const insertWord = db.prepare("INSERT INTO SearchWords (word, EntityRowId) VALUES (?, ?)");
  const readContent = db.prepare(
    "SELECT rowid, coalesce(Title, '') || char(10) || coalesce(Content, '') FROM Entities"
  );
  while (readContent.step()) {
    const [rowid, text] = readContent.get() as [number, string];
    for (const word of new Set(tokenizeSearchText(text))) {
      insertWord.run([word, rowid]);
    }
  }
  readContent.free();
  insertWord.free();
  db.run("COMMIT");
  db.exec(
    "CREATE INDEX SearchWords_word ON SearchWords (word, EntityRowId);\
     CREATE INDEX Entities_ParentGOID_RecentTime ON Entities (ParentGOID, RecentTime DESC);\
     CREATE INDEX Entities_RecentTime ON Entities (RecentTime DESC);"
  );

  // CACHING PARENTS' TITLE :
  const results = db.exec("SELECT DISTINCT GOID, Title FROM Entities WHERE Type > 1");
  const cache = new Cache();
  cache.clear();
  for (const result of results[0]?.values ?? []) {
    cache.set(result[0] as string, result[1] as string);
  }

  // WRITE DB TO FILE
  const buffer = Buffer.from(db.export());

  writeFileSync(ONENOTE_MERGED_DB, buffer);
  await LocalStorage.setItem(SIGNATURE_KEY, signature);

  // CLOSE DBs
  for (const _db of ALL_DB) {
    _db.close();
  }
  db.close();
  return true;
};

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
  "TitleSearch         TEXT" +
  "); \n" +
  "DROP TABLE IF EXISTS SearchWords;\n" +
  "CREATE TABLE SearchWords (word TEXT NOT NULL, EntityRowId INTEGER NOT NULL);";
