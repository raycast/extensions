import * as raycastApi from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState, useSyncExternalStore } from "react";
import { createWindowSearch } from "./window-data";
import { getErrorMessage } from "./helpers/applescript";
import type { Window } from "./windows";

const cache = typeof raycastApi.Cache === "function" ? new raycastApi.Cache() : null;

/** Raycast owns request state; the snapshot store publishes progressive results. */
export function useWindowSearch(enabled = true) {
  const [search] = useState(() => createWindowSearch({ cache }));
  const data = useSyncExternalStore(search.subscribe, search.getSnapshot);
  const abortable = useRef<AbortController | null>(null);
  const { isLoading, error, revalidate } = usePromise(() => search.load(abortable.current!.signal), [], {
    execute: enabled,
    abortable,
    failureToastOptions: { title: "Failed to fetch windows" },
  });
  const cancelled = abortable.current?.signal.aborted;

  return {
    ...data,
    isLoading: isLoading && !cancelled,
    error: isLoading || cancelled || error === undefined ? undefined : getErrorMessage(error),
    refreshWindows: revalidate,
    removeWindow(target: Window) {
      // Stop late enrichment before publishing the confirmed removal.
      abortable.current?.abort();
      search.removeWindow(target);
    },
  };
}
