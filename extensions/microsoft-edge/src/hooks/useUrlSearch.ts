import { checkIfBrowserIsInstalled } from "../utils/appleScriptUtils";
import { Database } from "sql.js";
import { EDGE_NOT_INSTALLED_MESSAGE } from "../common/constants";
import { NullableString, UrlDetail, UrlSearchResult } from "../schema/types";
import { useEffect, useRef, useState } from "react";

export function useUrlSearch<SourceDataType>(
  query: NullableString,
  loadUrlsToLocalDb: () => Promise<SourceDataType>,
  searchUrls: (db: SourceDataType, query: NullableString) => Promise<UrlDetail[]>,
  resourceName?: string
): UrlSearchResult {
  const [entries, setEntries] = useState<UrlDetail[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const dbRef = useRef<SourceDataType>();

  let cancel = false;

  useEffect(() => {
    async function searchUrlsFromBrowser() {
      if (cancel) {
        return;
      }

      try {
        if (!dbRef.current) {
          dbRef.current = await loadUrlsToLocalDb();
        }

        setError(undefined);
        const urlItemEntries = await searchUrls(dbRef.current, query);
        setEntries(urlItemEntries);
      } catch (e) {
        if (!cancel) {
          const isEdgeInstalled = await checkIfBrowserIsInstalled();
          const errorMessage = !isEdgeInstalled
            ? EDGE_NOT_INSTALLED_MESSAGE
            : `Failed to show ${resourceName || "urls"}`;
          setError(errorMessage);
        }
      } finally {
        if (!cancel) setIsLoading(false);
      }
    }

    searchUrlsFromBrowser();

    return () => {
      cancel = true;
    };
  }, [query]);

  // Dispose of the database
  useEffect(() => {
    return () => {
      if (dbRef.current instanceof Database) {
        dbRef.current.close();
      }
    };
  }, []);

  return { entries, error, isLoading };
}
