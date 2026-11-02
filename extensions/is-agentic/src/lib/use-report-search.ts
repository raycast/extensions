import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";

import { getReport, IsAgenticError, normalizeUrl } from "./is-agentic";

const SEARCH_DELAY_MS = 300;

class ReportSearchError extends IsAgenticError {
  constructor(
    readonly url: string,
    error: unknown,
  ) {
    super(
      error instanceof Error ? error.message : "Could not retrieve this report.",
      error instanceof IsAgenticError ? error.code : undefined,
      error instanceof IsAgenticError ? error.resolution : undefined,
    );
    // Raycast ignores cancellation errors instead of displaying a failure.
    if (error instanceof Error) this.name = error.name;
  }
}

export function useReportSearch(initialUrl = "") {
  const [searchText, setSearchText] = useState(initialUrl);
  // Launch arguments execute immediately; only subsequent edits are debounced.
  const [settledText, setSettledText] = useState(initialUrl);
  const abortable = useRef<AbortController | null>(null);
  const isDebouncing = searchText !== settledText;

  useEffect(() => {
    const timeout = setTimeout(() => setSettledText(searchText), SEARCH_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [searchText]);

  let normalizedUrl = "";
  let inputError: Error | undefined;
  try {
    normalizedUrl = normalizeUrl(searchText);
  } catch (error) {
    inputError = error instanceof Error ? error : new Error("Enter a valid URL.");
  }

  const { data, isLoading, error } = useCachedPromise(
    async (url: string) => {
      try {
        return { url, report: await getReport(url, abortable.current?.signal) };
      } catch (error) {
        throw new ReportSearchError(url, error);
      }
    },
    [normalizedUrl],
    {
      abortable,
      // Disabling execution also aborts and invalidates the previous call.
      execute: Boolean(normalizedUrl) && !inputError && !isDebouncing,
      keepPreviousData: false,
      onError: () => {}, // The command renders failures in its empty view.
    },
  );

  return {
    searchText,
    setSearchText,
    report: !isDebouncing && Boolean(normalizedUrl) && data?.url === normalizedUrl ? data.report : undefined,
    isLoading: Boolean(normalizedUrl) && !inputError && (isDebouncing || isLoading),
    error:
      inputError ??
      (!isDebouncing && !isLoading && error instanceof ReportSearchError && error.url === normalizedUrl
        ? error
        : undefined),
  };
}
