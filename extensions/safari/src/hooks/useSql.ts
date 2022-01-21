import { environment } from "@raycast/api";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { useRef, useState, useEffect } from "react";
import initSqlJs, { Database } from "sql.js";

const loadDatabase = async (path: string) => {
  const fileContents = await readFile(path);
  const SQL = await initSqlJs({ locateFile: () => resolve(environment.assetsPath, "sql-wasm.wasm") });
  return new SQL.Database(fileContents);
};

const useSql = <Result>(path: string, query: string) => {
  const databaseRef = useRef<Database>();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [results, setResults] = useState<Result[]>();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    (async () => {
      if (!databaseRef.current) {
        databaseRef.current = await loadDatabase(path);
      }

      try {
        const newResults = new Array<Result>();
        const statement = databaseRef.current.prepare(query);
        while (statement.step()) {
          newResults.push(statement.getAsObject() as unknown as Result);
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
