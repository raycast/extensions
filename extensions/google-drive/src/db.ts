import { environment, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { useEffect, useState } from "react";
import initSqlJs, { Database } from "sql.js";

import { DB_FILE_PATH, MAX_RESULTS_WITHOUT_SEARCH_TEXT, MAX_RESULTS_WITH_SEARCH_TEXT } from "./constants";
import { FileInfo, Preferences } from "./types";
import { fuzzyMatch } from "./utils";

export const persistDb = (db: Database) => {
  writeFileSync(DB_FILE_PATH, Buffer.from(db.export()));
};

const dbConnection = async () => {
  const SQL = await initSqlJs({ locateFile: () => join(environment.assetsPath, "sql-wasm.wasm") });
  if (!existsSync(DB_FILE_PATH)) {
    const db = new SQL.Database();
    await writeFileSync(DB_FILE_PATH, db.export());
    db.close();
  }

  try {
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
    const db = new SQL.Database(readFileSync(DB_FILE_PATH));

    db.exec(createFilesTable);

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
        persistDb(db);
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
