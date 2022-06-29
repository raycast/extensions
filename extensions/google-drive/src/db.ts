import { environment, getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { Entry } from "fast-glob";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { useEffect, useState } from "react";
import initSqlJs, { Database } from "sql.js";

import {
  DB_FILE_PATH,
  FILES_LAST_INDEXED_AT_KEY,
  MAX_RESULTS_WITHOUT_SEARCH_TEXT,
  MAX_RESULTS_WITH_SEARCH_TEXT,
  TOAST_UPDATE_INTERVAL,
} from "./constants";
import { FileInfo, Preferences } from "./types";
import {
  clearAllFilePreviewsCache,
  formatBytes,
  fuzzyMatch,
  displayPath,
  getDriveRootPath,
  throttledUpdateToastMessage,
  driveFileStream,
  log,
} from "./utils";

export const filesLastIndexedAt = async () => {
  const lastIndexedAt = await LocalStorage.getItem<string>(FILES_LAST_INDEXED_AT_KEY);
  return lastIndexedAt ? new Date(lastIndexedAt) : null;
};

export const shouldInvalidateFilesIndex = async () => {
  const lastIndexedAt = await filesLastIndexedAt();

  if (lastIndexedAt === null) return true;

  const { autoReindexingInterval } = getPreferenceValues<Preferences>();

  return lastIndexedAt.getTime() < new Date().getTime() - parseInt(autoReindexingInterval);
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
    await mandateFilesIndexInvalidation();
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

    const deleteDuplicatesByDisplayPath = `
      DELETE FROM files
      WHERE displayPath IN (
        SELECT displayPath
        FROM files
        GROUP BY displayPath
        HAVING COUNT(*) > 1
      );`;

    const createIndexes = `
      CREATE UNIQUE INDEX IF NOT EXISTS filesDisplayPathUniqueIndex
        ON files (displayPath);
    `;

    // Delete the paths that were indexed for a Google Drive root path that was
    // previously specified in the preferences but has been changed to
    // another path now.
    const deleteUnwantedFiles = `
        DELETE FROM files
          WHERE path NOT LIKE "${getDriveRootPath()}%"`;

    db.exec(createFilesTable);
    db.exec(deleteDuplicatesByDisplayPath);
    db.exec(createIndexes);
    db.exec(deleteUnwantedFiles);

    return db;
  } catch (e) {
    log("error", e);
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

export const queryFavoriteFiles = (db: Database, limit = 50) => {
  const files: Array<FileInfo> = [];

  if (!db) return files;

  const statement = db.prepare(`SELECT * FROM files WHERE favorite = 1 ORDER BY updatedAt DESC LIMIT ${limit}`);
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
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (displayPath) DO
          UPDATE SET name = EXCLUDED.name, path = EXCLUDED.path, displayPath = EXCLUDED.displayPath, fileSizeFormatted = EXCLUDED.fileSizeFormatted, createdAt = EXCLUDED.createdAt, updatedAt = EXCLUDED.updatedAt;`;

  db.run(insertStatement, [name, path, displayPath, fileSizeFormatted, createdAt, updatedAt]);
};

const listFilesAndInsertIntoDb = async (db: Database, toast: Toast): Promise<void> => {
  const updateToastMessage = throttledUpdateToastMessage({ toast, interval: TOAST_UPDATE_INTERVAL });

  let totalFiles = 0;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for await (const _ of driveFileStream()) {
    totalFiles += 1;
    updateToastMessage(`Counting files: ${totalFiles}`);
  }

  let filesIndexed = 0;
  for await (const file of driveFileStream({ stats: true })) {
    const { name, path, stats } = file as unknown as Entry;

    if (stats === undefined) {
      continue;
    }

    filesIndexed += 1;

    updateToastMessage(`Indexing: ${Math.round((filesIndexed / totalFiles) * 100)}% (${filesIndexed}/${totalFiles})`);

    insertFile(db, {
      name,
      path,
      displayPath: displayPath(path),
      fileSizeFormatted: formatBytes(stats.size > 0 ? stats.size : 0),
      createdAt: (stats.birthtime ? stats.birthtime : new Date()).toISOString(),
      updatedAt: (stats.mtime ? stats.mtime : new Date()).toISOString(),
      favorite: false,
    });
  }
};

type IndexFilesOptions = { force?: boolean };
export const indexFiles = async (db: Database, options: IndexFilesOptions = { force: false }): Promise<boolean> => {
  if (options.force || (await shouldInvalidateFilesIndex())) {
    const alreadyIndexed = !!(await filesLastIndexedAt());
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${alreadyIndexed ? "Updating file index" : "Indexing files"} ${
        alreadyIndexed ? "" : "for the first time"
      }`,
      message: "This may take some time, please wait...",
    });

    // Backup the favorite file paths before indexing
    const favoriteFilePaths = queryFavoriteFiles(db, 1000).map((file) => file.path);

    // Delete all the old indexed files
    db.exec("DELETE from files");

    clearAllFilePreviewsCache(false);

    await listFilesAndInsertIntoDb(db, toast);

    // Restore the favorite file paths
    favoriteFilePaths.forEach((filePath) => {
      db.run(`UPDATE files SET favorite = 1 WHERE path = ?`, [filePath]);
    });

    dumpDb(db);
    await setFilesIndexedAt();

    toast.hide();
    return true;
  }

  return false;
};

export const toggleFavorite = (db: Database, path: string, isFavorite: boolean) => {
  if (!db) return;

  const updateStatement = `
      UPDATE files
        SET favorite = ${isFavorite ? 1 : 0}
        WHERE path = "${path}"`;

  db.exec(updateStatement);
  dumpDb(db);
};
