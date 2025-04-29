import { getPreferenceValues } from "@raycast/api";
import { useState, useCallback } from "react";
import { usePromise, showFailureToast } from "@raycast/utils";
import { Preferences, Tab } from "../types";
import { fetchQutebrowserTabs } from "../utils/tabFetcher";
import { formatError } from "../utils/common/errorUtils";
import { sanitizeCommandString } from "../utils/common/stringUtils";
import { executeCommand } from "../utils/browserUtils";

export function useQutebrowserTabs() {
  const preferences = getPreferenceValues<Preferences>();
  const qutebrowserPath = preferences.qutebrowserPath || "/opt/homebrew/bin/qutebrowser";

  const {
    data: tabs = [],
    isLoading,
    error,
    revalidate,
  } = usePromise(fetchQutebrowserTabs, [], {
    onError: (error) => {
      showFailureToast(error, {
        title: "Failed to fetch tabs",
      });
    },
  });

  const [searchText, setSearchText] = useState<string>("");

  const filteredTabs = tabs.filter((tab) => {
    if (!searchText.trim()) return true;

    const lowerCaseSearch = searchText.toLowerCase();
    return tab.title.toLowerCase().includes(lowerCaseSearch) || tab.url.toLowerCase().includes(lowerCaseSearch);
  });

  const focusTab = useCallback(
    async (tab: Tab) => {
      try {
        const safeUrl = sanitizeCommandString(tab.url);
        await executeCommand(qutebrowserPath, `:tab-select ${safeUrl}`);

        return true;
      } catch (err) {
        showFailureToast(err, {
          title: "Failed to focus tab",
        });
        return false;
      }
    },
    [qutebrowserPath],
  );

  const openSearchInNewTab = useCallback(
    async (query: string) => {
      try {
        const safeQuery = sanitizeCommandString(query);
        await executeCommand(qutebrowserPath, `:open -t DEFAULT ${safeQuery}`);
        return true;
      } catch (err) {
        showFailureToast(err, {
          title: "Failed to open search",
        });
        return false;
      }
    },
    [qutebrowserPath],
  );

  const openUrlInNewTab = useCallback(
    async (url: string) => {
      try {
        const safeUrl = sanitizeCommandString(url);
        await executeCommand(qutebrowserPath, `:open -t ${safeUrl}`);
        return true;
      } catch (err) {
        showFailureToast(err, {
          title: "Failed to open URL",
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
    error: error ? formatError(error) : null,
    searchText,
    setSearchText,
    focusTab,
    openSearchInNewTab,
    openUrlInNewTab,
    refreshTabs,
  };
}
