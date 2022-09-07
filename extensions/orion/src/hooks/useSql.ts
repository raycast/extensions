import { environment } from "@raycast/api";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { useEffect, useRef, useState } from "react";
import initSqlJs, { Database } from "sql.js";

const loadDatabase = async (path: string) => {
  const fileContents = await readFile(path);
  const wasmBinary = await readFile(resolve(environment.assetsPath, "sql-wasm.wasm"));
  const SQL = await initSqlJs({ wasmBinary });
  return new SQL.Database(fileContents);
};

const useSql = <T>(path: string, query: string) => {
  const databaseRef = useRef<Database>();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [results, setResults] = useState<T[]>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    (async () => {
      if (!databaseRef.current) {
        try {
          databaseRef.current = await loadDatabase(path);
        } catch (e) {
          setError(e);
          return;
        }
      }

      try {
        const newResults = new Array<T>();
        const statement = databaseRef.current.prepare(query);
        while (statement.step()) {
          newResults.push(statement.getAsObject() as unknown as T);
        }

        setResults(newResults);

        statement.free();
      } catch (e) {
        setError(e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [path, query]);

  useEffect(() => {
    return () => {
      databaseRef.current?.close();
    };
  }, []);

  return { results, error, isLoading };
};

export default useSql;
