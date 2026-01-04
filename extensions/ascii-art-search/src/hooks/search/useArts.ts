/**
 * Hook for fetching arts from API
 */
import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import type { Kaomoji } from "../../types";
import { fetchArts } from "../../data";

interface UseArtsResult {
  apiArts: Kaomoji[];
  isLoading: boolean;
}

export function useArts(): UseArtsResult {
  const [apiArts, setApiArts] = useState<Kaomoji[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchArts();
        setApiArts(data);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to fetch arts");
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load arts",
          message: error.message,
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  return { apiArts, isLoading };
}
