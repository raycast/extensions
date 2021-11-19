import { Database } from 'sql.js';
import { NullableString, UrlDetail, UrlSearchResult } from '../schema/types';
import { useEffect, useRef, useState } from 'react';

export function useUrlSearch(
  query: NullableString,
  loadUrlsToLocalDb: () => Promise<Database>,
  searchUrls: (db: Database, query: NullableString) => Promise<UrlDetail[]>
): UrlSearchResult {
  const [entries, setEntries] = useState<UrlDetail[]>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const dbRef = useRef<Database>();

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
          const errorMessage = (e as Error).message?.includes("no such file or directory")
            ? "Microsoft Edge not installed"
            : "Failed to load urls";
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
      dbRef.current?.close();
    };
  }, []);

  return { entries, error, isLoading };
}
