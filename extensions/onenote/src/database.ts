import { environment, LocalStorage, Cache } from "@raycast/api";
import { statSync, writeFileSync } from "fs";
import { readdir, readFile } from "fs/promises";
import { homedir } from "os";
import { resolve } from "path";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";

let SQL: SqlJsStatic;

const ONENOTE_FULL_SEARCH_PATH = resolve(
  homedir(),
  "Library/Containers/com.microsoft.onenote.mac/Data/Library/Application Support/Microsoft User Data/OneNote/15.0/FullTextSearchIndex"
);
export const ONENOTE_MERGED_DB = resolve(environment.supportPath, "merged-onenote-data.db");

let last_update_time = 0;

export const create_or_update_db = async (force_update = false) => {
  const now = Date.now();

  if (!SQL) {
    SQL = await initSqlJs({ locateFile: () => resolve(environment.assetsPath, "sql-wasm.wasm") });
  }

  // to cope with successive calls
  if (now - last_update_time < 300) {
    return true;
  }

  last_update_time = Date.now();
  let lastOneNoteModification = (await LocalStorage.getItem<number>("onenote-db-time")) as number;
  if (lastOneNoteModification == undefined) lastOneNoteModification = 0;
  let NEEDUPDATE = force_update;

  const ALL_DB_PATHS: string[] = [];
  const ALL_DB: Database[] = [];
  const ALL_DB_NAMES: string[] = [];

  // Search for OneNote databases:
  let mostRecent = 0;
  const db_files = await readdir(ONENOTE_FULL_SEARCH_PATH);
  for (const file of db_files) {
    if (file.indexOf(".db") != -1 && file.indexOf("journal") == -1) {
      const filepath = resolve(ONENOTE_FULL_SEARCH_PATH, file);
      ALL_DB_PATHS.push(filepath);
      const mtime = statSync(filepath).mtimeMs;
      if (mtime > mostRecent) mostRecent = mtime;
    }
  }

  if (mostRecent > lastOneNoteModification) {
    NEEDUPDATE = true;
    await LocalStorage.setItem("onenote-db-time", mostRecent);
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

  // CACHING PARENTS' TITLE :
  const results = db.exec("SELECT DISTINCT GOID, Title FROM Entities WHERE Type > 1");
  const cache = new Cache();
  cache.clear();
  for (const result of results[0].values) {
    cache.set(result[0] as string, result[1] as string);
  }

  // WRITE DB TO FILE
  const buffer = Buffer.from(db.export());

  writeFileSync(ONENOTE_MERGED_DB, buffer);

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
  "Content             TEXT" +
  "); ";
