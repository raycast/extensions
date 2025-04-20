import { getPreferenceValues } from "@raycast/api";
import { useState, useCallback } from "react";
import { usePromise, showFailureToast } from "@raycast/utils";
import { Preferences, Tab } from "../types";
import { fetchQutebrowserTabs } from "../utils/tabFetcher";
import SessionUtils from "../utils/sessionUtils";

export function useQutebrowserTabs() {
  const preferences = getPreferenceValues<Preferences>();
  const qutebrowserPath =
    preferences.qutebrowserPath || "/opt/homebrew/bin/qutebrowser";

  const {
    data: tabs = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(fetchQutebrowserTabs, [], {
    onError: (error) => {
      showFailureToast({
        title: "Failed to fetch tabs",
        message: SessionUtils.formatError(error),
      });
    },
  });

  const [searchText, setSearchText] = useState<string>("");

  const filteredTabs = tabs.filter((tab) => {
    if (!searchText.trim()) return true;

    const lowerCaseSearch = searchText.toLowerCase();
    return (
      tab.title.toLowerCase().includes(lowerCaseSearch) ||
      tab.url.toLowerCase().includes(lowerCaseSearch)
    );
  });

  const focusTab = useCallback(
    async (tab: Tab) => {
      try {
        await SessionUtils.executeCommand(
          qutebrowserPath,
          `:tab-select ${tab.url}`,
        );

        return true;
      } catch (err) {
        showFailureToast({
          title: "Failed to focus tab",
          message: SessionUtils.formatError(err),
        });
        return false;
      }
    },
    [qutebrowserPath],
  );

  const openSearchInNewTab = useCallback(
    async (query: string) => {
      try {
        await SessionUtils.executeCommand(
          qutebrowserPath,
          `:open -t DEFAULT ${query}`,
        );
        return true;
      } catch (err) {
        showFailureToast({
          title: "Failed to open search",
          message: SessionUtils.formatError(err),
        });
        return false;
      }
    },
    [qutebrowserPath],
  );

  const openUrlInNewTab = useCallback(
    async (url: string) => {
      try {
        await SessionUtils.executeCommand(qutebrowserPath, `:open -t ${url}`);
        return true;
      } catch (err) {
        showFailureToast({
          title: "Failed to open URL",
          message: SessionUtils.formatError(err),
        });
        return false;
      }
    },
    [qutebrowserPath],
  );

  const refreshTabs = useCallback(async () => {
    return revalidate();
  }, [revalidate]);

  return {
    tabs,
    filteredTabs,
    isLoading,
    error: error ? String(error) : null,
    searchText,
    setSearchText,
    focusTab,
    openSearchInNewTab,
    openUrlInNewTab,
    refreshTabs,
  };
}
