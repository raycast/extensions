import path from "path";
import fs from "fs";
import util from "util";
import initSqlJs, { Database } from "sql.js";
import { useEffect, useRef, useState } from "react";
import { environment } from "@raycast/api";
import { getProfileName, historyDbPath } from "../utils";
import { NullableString } from "../schema/types";

const fsReadFile = util.promisify(fs.readFile);

export interface HistoryEntry {
  id: number;
  url: string;
  title: string;
  lastVisited: Date;
}

export interface EdgeHistorySearch {
  entries?: HistoryEntry[];
  error?: string;
  isLoading: boolean;
}

const loadDb = async (profileName: string): Promise<Database> => {
  const dbPath = historyDbPath(profileName);
  const fileBuffer = await fsReadFile(dbPath);
  const SQL = await initSqlJs({
    locateFile: () => path.join(environment.assetsPath, "sql-wasm.wasm"),
  });
  return new SQL.Database(fileBuffer);
};

const termsAsParamNames = (terms: string[]): string[] => {
  const p = [];
  for (let i = 0; i < terms.length; i++) {
    p.push(`@t_${i}`);
  }
  return p;
};

const termsAsParams = (terms: string[]) => {
  return termsAsParamNames(terms).reduce((all: { [key: string]: string }, t, i) => {
    all[t] = `%${terms[i]}%`;
    return all;
  }, {});
};

const whereClauses = (terms: string[]) => {
  return termsAsParamNames(terms)
    .map((t) => `urls.title LIKE ${t}`)
    .join(" AND ");
};

const searchHistory = async (db: Database, query: NullableString): Promise<HistoryEntry[]> => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = `SELECT
            id, url, title,
            datetime(last_visit_time / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime')
          FROM urls
          WHERE ${whereClauses(terms)}
          ORDER BY last_visit_time DESC LIMIT 30;`;
  const results = db.exec(queries, termsAsParams(terms));
  if (results.length !== 1) {
    return [];
  }

  return results[0].values.map((v) => ({
    id: v[0] as number,
    url: v[1] as string,
    title: v[2] as string,
    lastVisited: new Date(v[3] as string),
  }));
};

export function useEdgeHistorySearch(query: NullableString): EdgeHistorySearch {
  const [entries, setEntries] = useState<HistoryEntry[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const dbRef = useRef<Database>();

  let cancel = false;

  useEffect(() => {
    async function getHistory() {
      if (cancel) {
        return;
      }

      if (!dbRef.current) {
        const profileName = getProfileName();
        dbRef.current = await loadDb(profileName);
      }

      setError(undefined);
      try {
        const dbEntries = await searchHistory(dbRef.current, query);
        setEntries(dbEntries);
      } catch (e) {
        if (!cancel) {
          setError(e as string);
        }
      } finally {
        if (!cancel) setIsLoading(false);
      }
    }

    getHistory();

    return () => {
      cancel = true;
    };
  }, [query]);

  // Dispose of the database
  useEffect(() => {
    return () => {
      dbRef.current?.close();
    };
  }, []);

  return { entries, error, isLoading };
}
