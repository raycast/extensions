import { environment } from "@raycast/api";
import { readFile } from "fs/promises";
import { resolve } from "path";
import { useRef, useState, useEffect } from "react";
import initSqlJs, { Database } from "sql.js";
import { PermissionError } from "../utils";

const loadDatabase = async (path: string) => {
  const fileContents = await readFile(path);
  const wasmBinary = await readFile(resolve(environment.assetsPath, "sql-wasm.wasm"));
  const SQL = await initSqlJs({ wasmBinary });
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
        try {
          databaseRef.current = await loadDatabase(path);
        } catch (e) {
          if (e instanceof Error && e.message.includes("operation not permitted")) {
            setError(new PermissionError("You do not have permission to access the History database."));
          } else {
            setError(e);
          }
          return;
        }
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
        console.log("type", typeof e);
        if (error instanceof Error && error.message.includes("operation not permitted")) {
          console.log("ERRRORROROR");

          setError(new PermissionError("You do not have permission to access the History database."));
        } else {
          console.log("asdfasdf");

          setError(e);
        }
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
