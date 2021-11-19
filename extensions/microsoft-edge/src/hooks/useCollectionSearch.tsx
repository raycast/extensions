import path from "path";
import fs from "fs";
import util, { TextDecoder } from "util";
import initSqlJs, { Database } from "sql.js";
import { useEffect, useRef, useState } from "react";
import { environment } from "@raycast/api";
import { UrlSearchResult, UrlDetail, NullableString } from "../schema/types";
import { collectionsDbPath, getProfileName } from "../utils/pathUtils";
import { termsAsParamNames, termsAsParams } from "../utils/sqlUtils";

const fsReadFile = util.promisify(fs.readFile);

interface ItemSource {
  url: string;
  websiteName: string;
}

const loadCollectionsToLocalDb = async (profileName: string): Promise<Database> => {
  const dbPath = collectionsDbPath(profileName);
  const fileBuffer = await fsReadFile(dbPath);
  const SQL = await initSqlJs({
    locateFile: () => path.join(environment.assetsPath, "sql-collections.wasm"),
  });
  return new SQL.Database(fileBuffer);
};

const whereClauses = (terms: string[]) => {
  return termsAsParamNames(terms)
    .map((t) => `items.title LIKE ${t}`)
    .concat("type = 'website'")
    .join(" AND ");
};

export function decodeUint8ArrayBlob(blob: Uint8Array): unknown {
  const result = new TextDecoder().decode(blob);
  return result;
}

const searchCollection = async (db: Database, query: NullableString): Promise<UrlDetail[]> => {
  const terms = query ? query.trim().split(" ") : [""];
  const queries = `SELECT
            id, source, title, date_modified
          FROM items
          WHERE ${whereClauses(terms)}
          ORDER BY date_modified DESC LIMIT 30;`;
  const results = db.exec(queries, termsAsParams(terms));

  if (results.length !== 1) {
    return [];
  }

  return results[0].values.map((v) => {
    const source = decodeUint8ArrayBlob(v[1] as Uint8Array) as string;
    return {
      id: v[0] as string,
      url: (JSON.parse(source) as ItemSource).url as string,
      title: v[2] as string,
      lastVisited: new Date(v[3] as number),
    };
  });
};

export function useCollectionSearch(query: NullableString): UrlSearchResult {
  const [entries, setEntries] = useState<UrlDetail[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const dbRef = useRef<Database>();

  let cancel = false;

  useEffect(() => {
    async function getCollectionItems() {
      if (cancel) {
        return;
      }

      try {
        if (!dbRef.current) {
          const profileName = getProfileName();
          dbRef.current = await loadCollectionsToLocalDb(profileName);
        }

        setError(undefined);
        const resultEntries = await searchCollection(dbRef.current, query);
        // console.log("\n\nresultEntries", resultEntries);
        setEntries(resultEntries);
      } catch (e) {
        if (!cancel) {
          // console.log("HELLO\n", e.message, e.name, e.stack);
          const errorMessage = (e as Error).message?.includes("no such file or directory")
            ? "Microsoft Edge not installed"
            : "Failed to load Collections";
          setError(errorMessage);
        }
      } finally {
        if (!cancel) setIsLoading(false);
      }
    }

    getCollectionItems();

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
