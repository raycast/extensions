import { environment } from "@raycast/api";
import { resolve } from "path";
import { useEffect, useRef, useState } from "react";
import BetterSqlite, { Database } from "better-sqlite3";

const loadDatabase = async (path: string) => {
  return BetterSqlite(path, {
    readonly: true,
    nativeBinding: resolve(environment.assetsPath, "better_sqlite3.node"),
  });
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
        const statement = databaseRef.current.prepare(query);
        const newResults = statement.all() as T[];
        setResults(newResults);
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
