import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { useRef, useState, useEffect } from "react";
import initSqlJs, { Database } from "sql.js";
import { PermissionError } from "./utils";

// @ts-expect-error importing a wasm is tricky :)
import wasmBinary from "sql.js/dist/sql-wasm.wasm";

export const databasePath = join(homedir(), "Library", "Application Support", "Arc", "User Data", "Default", "History");

export function getQuery(searchText?: string) {
  const whereClause = searchText
    ? searchText
        .split(" ")
        .filter((word) => word.length > 0)
        .map((term) => `(url LIKE "%${term}%" OR title LIKE "%${term}%")`)
        .join(" AND ")
    : undefined;

  return `
    SELECT id,
          url,
          title,
          datetime(last_visit_time / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime') AS lastVisitedAt
    FROM urls
    ${whereClause ? `WHERE ${whereClause}` : ""}
    GROUP BY url
    ORDER BY last_visit_time DESC
    LIMIT 100;
  `;
}

const loadDatabase = async (path: string) => {
  const fileContents = await readFile(path);
  const SQL = await initSqlJs({ wasmBinary: Buffer.from(wasmBinary as Uint8Array) });
  return new SQL.Database(fileContents);
};

export const useSQL = <Result>(path: string, query: string) => {
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

  return { data: results, error, isLoading };
};
