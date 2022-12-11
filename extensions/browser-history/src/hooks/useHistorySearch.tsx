import path from "path";
import fs from "fs";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { useEffect, useRef, useState } from "react";
import { environment, getPreferenceValues } from "@raycast/api";
import {
  HistoryEntry,
  HistoryQueryFunction,
  HistorySearchResults,
  Preferences,
  SupportedBrowsers,
} from "../interfaces";
import { getHistoryDateColumn, getHistoryDbPath, getHistoryTable, PermissionError } from "../util";

const loadSql = async (): Promise<SqlJsStatic> => {
  const wasmBinary = await fs.promises.readFile(path.join(environment.assetsPath, "sql.wasm"));
  return initSqlJs({ wasmBinary });
};

const loadDb = async (sql: SqlJsStatic, browser: SupportedBrowsers): Promise<Database> => {
  const dbPath = await getHistoryDbPath(browser);
  const fileBuffer = await fs.promises.readFile(dbPath);
  return new sql.Database(fileBuffer);
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

const whereClauses = (table: string, terms: string[]) => {
  return termsAsParamNames(terms)
    .map((t) => `${table}.title LIKE ${t}`)
    .join(" AND ");
};

const getSafariHistoryQuery = (table: string, date_field: string, terms: string[]) =>
  `SELECT history_items.id, url, history_visits.title, datetime(${date_field}+978307200, "unixepoch", "localtime") as lastVisited
  FROM ${table}
    INNER JOIN history_visits
    ON history_visits.history_item = history_items.id
  WHERE ${whereClauses("history_visits", terms)}
  GROUP BY url
  ORDER BY ${date_field} DESC
  LIMIT 30
  `;

const getOtherHistoryQuery = (table: string, date_field: string, terms: string[]) => `SELECT
    id, url, title,
    datetime(${date_field} / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime')
  FROM ${table}
  WHERE ${whereClauses(table, terms)}
  ORDER BY ${date_field} DESC LIMIT 30;`;

const getHistoryQuery = (browser: SupportedBrowsers): HistoryQueryFunction => {
  switch (browser) {
    case SupportedBrowsers.Safari:
      return getSafariHistoryQuery;
    default:
      return getOtherHistoryQuery;
  }
};

const searchHistory = async (
  browser: SupportedBrowsers,
  db: Database,
  table: string,
  date_field: string,
  queryBuilder: (table: string, date_field: string, terms: string[]) => string,
  query?: string
): Promise<HistoryEntry[]> => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = queryBuilder(table, date_field, terms);

  const results = db.exec(queries, termsAsParams(terms));
  if (results.length !== 1) {
    return [];
  }
  return results[0].values.map((v) => ({
    id: `${browser}-${v[0]}`,
    url: v[1] as string,
    title: v[2] as string,
    lastVisited: new Date(v[3] as string),
  }));
};

export function useHistorySearch(query: string | undefined): HistorySearchResults {
  const preferences = getPreferenceValues<Preferences>();
  const [entriesChrome, setEntriesChrome] = useState<HistoryEntry[]>([]);
  const [entriesFirefox, setEntriesFirefox] = useState<HistoryEntry[]>([]);
  const [entriesSafari, setEntriesSafari] = useState<HistoryEntry[]>([]);
  const [entriesEdge, setEntriesEdge] = useState<HistoryEntry[]>([]);
  const [entriesBrave, setEntriesBrave] = useState<HistoryEntry[]>([]);
  const [entriesVivaldi, setEntriesVivaldi] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<unknown>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const dbRefChrome = useRef<Database>();
  const dbRefFirefox = useRef<Database>();
  const dbRefSafari = useRef<Database>();
  const dbRefEdge = useRef<Database>();
  const dbRefBrave = useRef<Database>();
  const dbRefVivaldi = useRef<Database>();
  const sqlRef = useRef<SqlJsStatic>();

  let cancel = false;

  const dbRefs = {
    [SupportedBrowsers.Chrome]: { ref: dbRefChrome, setter: setEntriesChrome },
    [SupportedBrowsers.Firefox]: { ref: dbRefFirefox, setter: setEntriesFirefox },
    [SupportedBrowsers.Safari]: { ref: dbRefSafari, setter: setEntriesSafari },
    [SupportedBrowsers.Edge]: { ref: dbRefEdge, setter: setEntriesEdge },
    [SupportedBrowsers.Brave]: { ref: dbRefBrave, setter: setEntriesBrave },
    [SupportedBrowsers.Vivaldi]: { ref: dbRefVivaldi, setter: setEntriesVivaldi },
  };

  useEffect(() => {
    async function getHistory() {
      if (cancel) {
        return;
      }
      try {
        setError(undefined);

        if (!sqlRef.current) {
          sqlRef.current = await loadSql();
        }

        await Promise.all(
          Object.entries(preferences)
            .filter(([key, val]) => key.startsWith("enable") && val)
            .map(async ([key]) => {
              const browser = key.replace("enable", "") as SupportedBrowsers;
              if (!dbRefs[browser].ref.current) {
                dbRefs[browser].ref.current = await loadDb(sqlRef.current!, browser);
              }
            })
        );

        await Promise.all(
          Object.entries(preferences)
            .filter(([key, val]) => key.startsWith("enable") && val)
            .map(async ([key]) => {
              const browser = key.replace("enable", "") as SupportedBrowsers;
              const db = dbRefs[browser].ref.current!;
              const setter = dbRefs[browser].setter;
              setter(
                await searchHistory(
                  browser,
                  db,
                  getHistoryTable(browser),
                  getHistoryDateColumn(browser),
                  getHistoryQuery(browser),
                  query
                )
              );
            })
        );
      } catch (e) {
        if (!cancel) {
          if (e instanceof Error && e.message.includes("operation not permitted")) {
            setError(new PermissionError("You do not have permission to access the History database."));
          } else {
            setError(e);
          }
        }
      } finally {
        if (!cancel) setIsLoading(false);
      }
    }

    getHistory().then();

    return () => {
      cancel = true;
    };
  }, [query]);

  // Dispose of the databases when the component unmounts
  useEffect(() => {
    return () => {
      Object.values(dbRefs).forEach((browser) => browser.ref?.current?.close());
    };
  }, []);

  return { entriesChrome, entriesFirefox, entriesSafari, entriesEdge, entriesBrave, entriesVivaldi, error, isLoading };
}
