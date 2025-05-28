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
        await resetToast();
        return;
      }
      const features = await fetchVenues(debouncedQuery, abortController.signal);
      try {
        if (!features || features.length === 0) {
          setToast(
            showToast({
              title: `No results searching for "${debouncedQuery}"`,
              style: Toast.Style.Failure,
            }),
          );
          setIsLoading(false);
          return;
        }
        setVenueResults(features);
        await resetToast();
      } catch (error) {
        console.error(error);
        setToast(
          showToast({
            title: "Something went wrong",
            style: Toast.Style.Failure,
          }),
        );
      } finally {
        setIsLoading(false);
      }
    })();
    return () => abortController.abort();
  }, [debouncedQuery]);

  return {
    venueResults,
    isLoading,
  };
}
