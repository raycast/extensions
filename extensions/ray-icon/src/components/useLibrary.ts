import { useEffect, useState } from "react";
import { Library, readLibrary, watchLibrary } from "../lib/library";

const EMPTY_LIBRARY: Library = { history: [], favorites: [], templates: [], issues: [] };

export function useLibrary() {
  const [library, setLibrary] = useState(EMPTY_LIBRARY);
  const [error, setError] = useState<Error>();
  const [isLoading, setLoading] = useState(true);
  function refresh() {
    try {
      setLibrary(readLibrary());
      setError(undefined);
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    refresh();
    try {
      return watchLibrary(refresh, setError);
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
    }
  }, []);
  return { library, error, isLoading, refresh };
}
