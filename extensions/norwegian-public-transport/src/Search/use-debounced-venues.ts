import { Alert, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchVenues } from "../api";
import { wipeStorage } from "../storage";
import { Feature } from "../types";
import { useDebounce } from "../utils";

export function useDebouncedVenues(
  query: string,
  toast: Promise<Toast> | undefined,
  setToast: (toast: Promise<Toast> | undefined) => void,
) {
  const [venueResults, setVenueResults] = useState<Feature[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const resetToast = async () => {
    setIsLoading(false);
    if (toast) {
      const t = await toast;
      t.hide();
    }
    setToast(undefined);
  };

  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    if (!query) return;
    setIsLoading(true);
    if (toast) return;
    setToast(
      showToast({
        title: "Searching...",
        style: Toast.Style.Animated,
      }),
    );
  }, [query]);

  useEffect(() => {
    const abortController = new AbortController();
    (async () => {
      if (debouncedQuery === undefined || debouncedQuery === "") {
        await resetToast();
        return;
      }
      if (debouncedQuery === "DEBUG_WIPE_STORAGE") {
        confirmAlert({
          title: "Wipe Storage",
          message: "Are you sure you want to wipe storage?",
          primaryAction: {
            title: "Yes",
            style: Alert.ActionStyle.Destructive,
            onAction: wipeStorage,
          },
        });
        setIsLoading(false);
        await resetToast();
        return;
      }
      const features = await fetchVenues(debouncedQuery, abortController.signal);
      if (features?.length === 0) {
        setToast(
          showToast({
            title: `No results searching for "${debouncedQuery}"`,
            style: Toast.Style.Failure,
          }),
        );
      } else if (features && features.length > 0) {
        setVenueResults(features);
        await resetToast();
      }
      setIsLoading(false);
    })();
    return () => abortController.abort();
  }, [debouncedQuery]);

  return {
    venueResults,
    isLoading,
  };
}
