import path from "path";
import fs from "fs";
import initSqlJs, { Database, SqlJsStatic } from "sql.js";
import { useEffect, useRef, useState } from "react";
import { environment, getPreferenceValues } from "@raycast/api";
import { HistoryEntry, HistorySearchResults, Preferences, SupportedBrowsers } from "../interfaces";
import { getHistoryDbPath, PermissionError } from "../util";

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

const getSafariHistoryQuery = (table: string, date_field: string, terms: string[]) => {
  return `
  SELECT history_items.id, url, history_visits.title, datetime(${date_field}+978307200, "unixepoch", "localtime") as lastVisited
  FROM ${table}
    INNER JOIN history_visits
    ON history_visits.history_item = history_items.id
  WHERE ${whereClauses("history_visits", terms)}
  GROUP BY url
  ORDER BY ${date_field} DESC
  LIMIT 30
  `;
};

const getChromeFirefoxHistoryQuery = (table: string, date_field: string, terms: string[]) => {
  return `SELECT
    id, url, title,
    datetime(${date_field} / 1000000 + (strftime('%s', '1601-01-01')), 'unixepoch', 'localtime')
  FROM ${table}
  WHERE ${whereClauses(table, terms)}
  ORDER BY ${date_field} DESC LIMIT 30;`;
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
  const [error, setError] = useState<unknown>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const dbRefChrome = useRef<Database>();
  const dbRefFirefox = useRef<Database>();
  const dbRefSafari = useRef<Database>();
  const sqlRef = useRef<SqlJsStatic>();

  let cancel = false;

  useEffect(() => {
    async function getHistory() {
      if (cancel) {
        return;
      }
      try {
        if (!sqlRef.current) {
          sqlRef.current = await loadSql();
        }

        if (preferences.enableChrome) {
          if (!dbRefChrome.current) {
            dbRefChrome.current = await loadDb(sqlRef.current, SupportedBrowsers.Chrome);
          }
        }

        if (preferences.enableFirefox) {
          if (!dbRefFirefox.current) {
            dbRefFirefox.current = await loadDb(sqlRef.current, SupportedBrowsers.Firefox);
          }
        }

        if (preferences.enableSafari) {
          if (!dbRefSafari.current) {
            dbRefSafari.current = await loadDb(sqlRef.current, SupportedBrowsers.Safari);
          }
        }

        setError(undefined);
        // const entries = [];
        if (preferences.enableChrome) {
          setEntriesChrome(
            await searchHistory(
              SupportedBrowsers.Chrome,
              dbRefChrome.current!,
              "urls",
              "last_visit_time",
              getChromeFirefoxHistoryQuery,
              query
            )
          );
        }
        if (preferences.enableFirefox) {
          setEntriesFirefox(
            await searchHistory(
              SupportedBrowsers.Firefox,
              dbRefFirefox.current!,
              "moz_places",
              "last_visit_date",
              getChromeFirefoxHistoryQuery,
              query
            )
          );
        }
        if (preferences.enableSafari) {
          setEntriesSafari(
            await searchHistory(
              SupportedBrowsers.Safari,
              dbRefSafari.current!,
              "history_items",
              "visit_time",
              getSafariHistoryQuery,
              query
            )
          );
        }
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

    getHistory();

    return () => {
      cancel = true;
    };
  }, [query]);

  // Dispose of the database
  useEffect(() => {
    return () => {
      dbRefChrome.current?.close();
      dbRefFirefox.current?.close();
      dbRefSafari.current?.close();
    };
  }, []);

  return { entriesChrome, entriesFirefox, entriesSafari, error, isLoading };
}
