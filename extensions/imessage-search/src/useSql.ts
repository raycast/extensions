import { environment } from "@raycast/api";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { useRef, useState, useEffect } from "react";
import initSqlJs, { Database, type SqlJsStatic } from "sql.js";

let SQL: SqlJsStatic | undefined;

const loadDatabase = async (path: string) => {
  const fileContents = await readFile(path);

  if (!SQL) {
    SQL = await initSqlJs({ locateFile: () => resolve(environment.assetsPath, "sql-wasm.wasm") });
  }

  return new SQL.Database(fileContents);
};

export const useSqlite = (dbPath: string) => {
  const db = useRef<Database>();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    (async () => {
      // close the previous database
      if (db.current) {
        db.current.close();
      }

      try {
        // @note this loads the ENTIRE database into memory
        db.current = await loadDatabase(dbPath);
      } catch (e) {
        if (e instanceof Error && e.message.includes("operation not permitted")) {
          setError(new PermissionError("You do not have permission to access the History database."));
        } else {
          setError(e);
        }
        return;
      } finally {
        setIsLoading(false);
      }
    })();
  }, [dbPath]);

  // close the current db on unmount
  useEffect(() => {
    return () => {
      db.current?.close();
    };
  }, []);

  return { db, error, isLoading };
};

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export const isPermissionError = (error: unknown) => {
  return error instanceof Error && error.name === "PermissionError";
};
