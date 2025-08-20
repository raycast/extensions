import { useCometHistoryDB } from "../lib/database";
import { CometHistoryEntry } from "../lib/types";
import { handleError } from "../lib/utils";
import { useState, useEffect } from "react";

export function useCometHistory(searchText: string, limit = 100) {
  const [data, setData] = useState<CometHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use the database hook
  const { data: dbData, isLoading: dbLoading, error: dbError } = useCometHistoryDB(searchText, limit);

  useEffect(() => {
    if (dbError) {
      handleError(dbError, "getting history");
      setError(dbError);
      setData([]);
      setIsLoading(false);
    } else {
      setData(dbData || []);
      setError(null);
      setIsLoading(dbLoading);
    }
  }, [dbData, dbLoading, dbError]);

  return {
    data,
    isLoading,
    error,
  };
}
