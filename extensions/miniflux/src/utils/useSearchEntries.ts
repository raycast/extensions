import { useCallback, useEffect, useState } from "react";
import { MinifluxApiError, MinifluxEntries, State } from "./types";
import apiServer from "./api";
import { useErrorHandler } from "../utils/useErrorHandler";
import { Cache, Toast, showToast } from "@raycast/api";

const cache = new Cache();

export const useSearchEntries = (searchText: string): State => {
  const cached = cache.get("latest-entries");

  const [state, setState] = useState<State>({
    entries: cached ? JSON.parse(cached) : [],
    isLoading: false,
  });

  const handleError = useErrorHandler();

  const message = (total: number) => {
    switch (total) {
      case 0:
        return "No results found, try a different query";
      case 1:
        return "1 result found";
      default:
        return `${total} results found`;
    }
  };

  const fetchData = useCallback(async () => {
    if (!searchText) return;

    setState((oldState) => ({ ...oldState, isLoading: true }));
    try {
      showToast(Toast.Style.Animated, "Searching for entries...");
      const { total, entries }: MinifluxEntries = await apiServer.search(searchText);
      setState({ total, entries, isLoading: false });
      showToast(Toast.Style.Success, message(total));
    } catch (error) {
      handleError(error as MinifluxApiError);
      setState((oldState) => ({ ...oldState, isLoading: false }));
    }
  }, [searchText, handleError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return state;
};
