import { Alert, confirmAlert, showToast, Toast } from "@raycast/api";
import { AbortError } from "node-fetch";
import { useCallback, useEffect, useRef, useState } from "react";
import { contactService } from "../services/contactService";
import { storageService } from "../services/storageService";
import { SearchResult, SearchState } from "../types";
import { WeChatManager } from "../utils/wechatManager";

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    items: [],
    recentContacts: [],
    isLoading: true,
    searchText: "",
  });
  const cancelRef = useRef<AbortController | null>(null);
  const allContactsRef = useRef<SearchResult[]>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const clearRecentContacts = useCallback(async () => {
    const options: Alert.Options = {
      title: "Clear Search History",
      message: "Are you sure you want to clear all recent contact history?",
      primaryAction: {
        title: "Confirm",
        style: Alert.ActionStyle.Destructive,
      },
      dismissAction: {
        title: "Cancel",
      },
    };

    const confirmed = await confirmAlert(options);

    if (confirmed) {
      const success = await storageService.clearRecentContacts();
      if (success) {
        setState((oldState) => ({
          ...oldState,
          recentContacts: [],
          isLoading: true,
        }));

        try {
          const items = await contactService.searchContacts("", new AbortController().signal);
          setState((oldState) => ({
            ...oldState,
            items: items,
            isLoading: false,
          }));

          await showToast({
            style: Toast.Style.Success,
            title: "Search history cleared",
          });
        } catch (error) {
          console.error("Failed to reload contacts:", error);
          setState((oldState) => ({
            ...oldState,
            isLoading: false,
          }));
        }
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to clear search history",
        });
      }
    }
  }, []);

  const search = useCallback(
    async function search(searchText: string) {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }

      if (cancelRef.current) {
        cancelRef.current.abort();
      }

      setState((oldState) => ({
        ...oldState,
        searchText: searchText,
      }));

      searchDebounceRef.current = setTimeout(async () => {
        setState((oldState) => ({
          ...oldState,
          isLoading: true,
        }));

        cancelRef.current = new AbortController();

        try {
          const [recentContacts, items] = await Promise.all([
            storageService.getRecentContacts(),
            contactService.searchContacts(searchText, cancelRef.current.signal),
          ]);

          if (searchText.length === 0 && items.length > 0) {
            allContactsRef.current = items;
          }

          setState((oldState) => ({
            ...oldState,
            items: items,
            recentContacts: recentContacts,
            isLoading: false,
          }));
        } catch (error) {
          if (!(error instanceof AbortError)) {
            setState((oldState) => ({
              ...oldState,
              isLoading: false,
            }));

            console.error("Search failed:", error);
            await showToast({
              style: Toast.Style.Failure,
              title: "Search failed",
              message: String(error),
            });

            if (!WeChatManager.isWeChatRunning()) {
              await showToast({
                style: Toast.Style.Failure,
                title: "WeChat is not running",
                message: "Please start WeChat to use this extension",
              });
            }
          }
        }
      }, 150);
    },
    [cancelRef, setState],
  );

  useEffect(() => {
    search("");
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
      if (cancelRef.current) {
        cancelRef.current.abort();
      }
    };
  }, []);

  return {
    state,
    search,
    clearRecentContacts,
  };
}
