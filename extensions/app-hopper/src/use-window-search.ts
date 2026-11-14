import * as raycastApi from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createWindowSearch } from "./window-data";
import { getErrorMessage } from "./helpers/applescript";

const cache = typeof raycastApi.Cache === "function" ? new raycastApi.Cache() : null;

/** Adapt the search lifetime to React and present failures in Raycast. */
export function useWindowSearch(enabled = true) {
  const [search] = useState(() => createWindowSearch({ cache }));
  const state = useSyncExternalStore(search.subscribe, search.getSnapshot);

  useEffect(() => {
    if (!enabled) return;
    void search.refresh();
    return search.cancel;
  }, [enabled, search]);

  useEffect(() => {
    if (state.error !== undefined) void showFailureToast(state.error, { title: "Failed to fetch windows" });
  }, [state.error]);

  return {
    ...state.data,
    isLoading: state.isLoading,
    error: state.error === undefined ? undefined : getErrorMessage(state.error),
    refreshWindows: search.refresh,
    removeWindow: search.removeWindow,
  };
}
