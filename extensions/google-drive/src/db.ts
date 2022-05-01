import { environment, getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { existsSync, PathLike, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { useEffect, useState } from "react";
import initSqlJs, { Database } from "sql.js";

import {
  DB_FILE_PATH,
  FILES_LAST_INDEXED_AT_KEY,
  MAX_RESULTS_WITHOUT_SEARCH_TEXT,
  MAX_RESULTS_WITH_SEARCH_TEXT,
} from "./constants";
import { FileInfo, Preferences } from "./types";
import {
  clearAllFilePreviewsCache,
  fuzzyMatch,
  getDirectories,
  getDriveRootPath,
  getExcludePaths,
  saveFilesInDirectory,
} from "./utils";

export const filesLastIndexedAt = async () => {
  const lastIndexedAt = await LocalStorage.getItem<string>(FILES_LAST_INDEXED_AT_KEY);
  return lastIndexedAt ? new Date(lastIndexedAt) : null;
};

export const shouldInvalidateFilesIndex = async () => {
  const lastIndexedAt = await filesLastIndexedAt();

  if (lastIndexedAt === null) return true;

  return lastIndexedAt.getTime() < new Date().getTime() - 1000 * 60 * 60 * 24 * 7; // 7 days
};

const mandateFilesIndexInvalidation = async () => {
  await LocalStorage.removeItem(FILES_LAST_INDEXED_AT_KEY);
};

export const setFilesIndexedAt = async () => {
  await LocalStorage.setItem(FILES_LAST_INDEXED_AT_KEY, new Date().toISOString());
};

export const dumpDb = (db: Database) => {
  writeFileSync(DB_FILE_PATH, Buffer.from(db.export()));
};

const dbConnection = async () => {
  const SQL = await initSqlJs({ locateFile: () => join(environment.assetsPath, "sql-wasm.wasm") });
  if (!existsSync(DB_FILE_PATH)) {
    const db = new SQL.Database();
    await writeFileSync(DB_FILE_PATH, db.export());
    db.close();
    mandateFilesIndexInvalidation();
  }

  try {
    const db = new SQL.Database(readFileSync(DB_FILE_PATH));
    const createFilesTable = `
      CREATE TABLE IF NOT EXISTS files (
        name TEXT NOT NULL,
        path TEXT NOT NULL PRIMARY KEY,
        displayPath TEXT NOT NULL,
        fileSizeFormatted TEXT NOT NULL,
        createdAt DATETIME NOT NULL,
        updatedAt DATETIME NOT NULL,
        favorite INTEGER NOT NULL DEFAULT 0
      )`;

    // Delete the paths that were indexed for a Google Drive root path that was
    // previously specified in the preferences but has been changed to
    // another path now.
    const deleteUnwantedFiles = `
        DELETE FROM files
          WHERE path NOT LIKE "${getDriveRootPath()}%"`;

    db.exec(createFilesTable);
    db.exec(deleteUnwantedFiles);

    return db;
  } catch (e) {
    console.error(e);
    showToast({ style: Toast.Style.Failure, title: `Unable to open the database file at ${DB_FILE_PATH}` });
    return null;
  }
};

export const useDb = () => {
  const [db, setDb] = useState<Database | null>(null);

  useEffect(() => {
    const connect = async () => {
      const db = await dbConnection();
      setDb(db);
    };

    connect();

    return () => {
      if (db) {
        dumpDb(db);
        db.close();
        setDb(null);
      }
    };
  }, []);

  return db;
};

export const queryFiles = (db: Database, searchText: string) => {
  const files: Array<FileInfo> = [];

  if (!db) return files;

  const preferences = getPreferenceValues<Preferences>();

  // Define a custom function to fuzzy match the searchText
  db.create_function("fuzzyMatch", fuzzyMatch);

  const hiddenFileFilterClause = "name NOT LIKE '.%'";

  let query = `SELECT * FROM files ${
    preferences.shouldShowHiddenFiles ? "" : "WHERE " + hiddenFileFilterClause
  } ORDER BY updatedAt DESC LIMIT ${MAX_RESULTS_WITHOUT_SEARCH_TEXT}`;

  if (searchText.trim() !== "") {
    query = `
      SELECT *, fuzzyMatch($searchText, displayPath) AS searchScore
        FROM files
        WHERE fuzzyMatch($searchText, displayPath) > 10
          ${preferences.shouldShowHiddenFiles ? "" : "AND " + hiddenFileFilterClause}
        ORDER BY searchScore DESC, updatedAt DESC
        LIMIT ${MAX_RESULTS_WITH_SEARCH_TEXT}`;
  }

  const statement = db.prepare(query);
  statement.bind({ $searchText: searchText });
  while (statement.step()) {
    files.push(statement.getAsObject() as unknown as FileInfo);
  }
  statement.free();
  statement.freemem();

  return files;
};

export const insertFile = (
  db: Database,
  { name, path, displayPath, fileSizeFormatted, createdAt, updatedAt }: FileInfo
) => {
  if (!db) return;

  const insertStatement = `
      INSERT
        INTO files (name, path, displayPath, fileSizeFormatted, createdAt, updatedAt)
        VALUES ("${name}", "${path}", "${displayPath}", "${fileSizeFormatted}", "${createdAt.toISOString()}", "${updatedAt.toISOString()}")
        ON CONFLICT (path) DO
          UPDATE SET name = EXCLUDED.name, displayPath = EXCLUDED.displayPath, fileSizeFormatted = EXCLUDED.fileSizeFormatted, createdAt = EXCLUDED.createdAt, updatedAt = EXCLUDED.updatedAt;`;

  db.run(insertStatement);
};

export const walkRecursivelyAndSaveFiles = (path: PathLike, db: Database): void => {
  if (getExcludePaths().includes(path.toLocaleString())) return;
  saveFilesInDirectory(path, db);
  getDirectories(path).map((dir) => walkRecursivelyAndSaveFiles(dir, db));
};

type IndexFilesOptions = { force?: boolean };
export const indexFiles = async (
  path: PathLike,
  db: Database,
  options: IndexFilesOptions = { force: false }
): Promise<boolean> => {
  if (options.force || (await shouldInvalidateFilesIndex())) {
    if (options.force) {
      // Delete all the old indexed files
      db.exec("DELETE from files");

      clearAllFilePreviewsCache(false);
    }

    walkRecursivelyAndSaveFiles(path, db);
    dumpDb(db);
    await setFilesIndexedAt();

    return true;
  }

  return false;
};
