import { useEffect, useRef, useState } from "react";
import { LocalStorage, Toast, environment, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { FolderSearchPlugin, SpotlightSearchResult } from "../types";
import { loadPlugins, lastUsedSort } from "../utils";
import { searchSpotlight } from "../search-spotlight";

export function useFolderSearch() {
  const [searchText, setSearchText] = useState<string>("");
  const [pinnedResults, setPinnedResults] = useState<SpotlightSearchResult[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [searchScope, setSearchScope] = useState<string>("");
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(true);
  const [results, setResults] = useState<SpotlightSearchResult[]>([]);
  const [plugins, setPlugins] = useState<FolderSearchPlugin[]>([]);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [canExecute, setCanExecute] = useState<boolean>(false);
  const [hasCheckedPlugins, setHasCheckedPlugins] = useState<boolean>(false);
  const [hasCheckedPreferences, setHasCheckedPreferences] = useState<boolean>(false);

  const abortable = useRef<AbortController>();
  const searchTextRef = useRef<string>(searchText);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Update ref when searchText changes
  useEffect(() => {
    searchTextRef.current = searchText;
  }, [searchText]);

  // debounce search
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      // Only proceed if the text hasn't changed during the delay
      if (searchTextRef.current === searchText) {
        abortable.current?.abort();
        setResults([]);

        if (searchScope === "pinned") {
          setResults(
            pinnedResults.filter((pin) =>
              pin.kMDItemFSName.toLocaleLowerCase().includes(searchText.replace(/[[|\]]/gi, "").toLocaleLowerCase())
            )
          );
          setCanExecute(false);
          setIsQuerying(false);
        } else {
          setCanExecute(true);
        }
      }
    }, 150); // 150ms debounce delay

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchText, searchScope, pinnedResults]);

  // check plugins
  usePromise(
    async () => {
      const plugins = await loadPlugins();
      setPlugins(plugins);
    },
    [],
    {
      onData() {
        setHasCheckedPlugins(true);
      },
      onError() {
        showToast({
          title: "An Error Occurred",
          message: "Could not read plugins",
          style: Toast.Style.Failure,
        });

        setHasCheckedPlugins(true);
      },
    }
  );

  // check prefs
  usePromise(
    async () => {
      const maybePreferences = await LocalStorage.getItem(`${environment.extensionName}-preferences`);

      if (maybePreferences) {
        try {
          return JSON.parse(maybePreferences as string);
        } catch (_) {
          // noop
        }
      }
    },
    [],
    {
      onData(preferences) {
        setPinnedResults(preferences?.pinned || []);
        setSearchScope(preferences?.searchScope || "");
        setIsShowingDetail(preferences?.isShowingDetail);
        setHasCheckedPreferences(true);
      },
      onError() {
        showToast({
          title: "An Error Occurred",
          message: "Could not read preferences",
          style: Toast.Style.Failure,
        });

        setHasCheckedPreferences(true);
      },
    }
  );

  // Save preferences
  useEffect(() => {
    (async () => {
      if (!(hasCheckedPlugins && hasCheckedPreferences)) {
        return;
      }

      await LocalStorage.setItem(
        `${environment.extensionName}-preferences`,
        JSON.stringify({
          pinned: pinnedResults,
          searchScope,
          isShowingDetail,
        })
      );
    })();
  }, [pinnedResults, searchScope, isShowingDetail, hasCheckedPlugins, hasCheckedPreferences]);

  // perform search
  usePromise(
    searchSpotlight,
    [
      searchText,
      searchScope,
      abortable,
      (result: SpotlightSearchResult) => {
        setResults((results) => [result, ...results].sort(lastUsedSort));
      },
    ],
    {
      onWillExecute: () => {
        setIsQuerying(true);
        setCanExecute(false);
      },
      onData: () => {
        setIsQuerying(false);
      },
      onError: (e) => {
        if (e.name !== "AbortError") {
          showToast({
            title: "An Error Occurred",
            message: "Something went wrong. Try again.",
            style: Toast.Style.Failure,
          });
        }

        setIsQuerying(false);
      },
      execute: hasCheckedPlugins && hasCheckedPreferences && canExecute && !!searchText,
      abortable,
    }
  );

  // Helper functions
  const resultIsPinned = (result: SpotlightSearchResult) => {
    return pinnedResults.map((pin) => pin.path).includes(result.path);
  };

  const removeResultFromPinnedResults = (result: SpotlightSearchResult) => {
    setPinnedResults((pinnedResults) => pinnedResults.filter((pinnedResult) => pinnedResult.path !== result.path));
  };

  const toggleResultPinnedStatus = (result: SpotlightSearchResult, resultIndex: number) => {
    if (!resultIsPinned(result)) {
      setPinnedResults((pinnedResults) => [result, ...pinnedResults]);
    } else {
      removeResultFromPinnedResults(result);
    }

    setSelectedItemId(`result-${resultIndex.toString()}`);
  };

  const movePinUp = (result: SpotlightSearchResult, resultIndex: number) => {
    const newIndex = resultIndex - 1;
    const newPinnedResults = [...pinnedResults];
    [newPinnedResults[resultIndex], newPinnedResults[newIndex]] = [
      newPinnedResults[newIndex],
      newPinnedResults[resultIndex],
    ];
    setPinnedResults(newPinnedResults);
  };

  const movePinDown = (result: SpotlightSearchResult, resultIndex: number) => {
    const newIndex = resultIndex + 1;
    const newPinnedResults = [...pinnedResults];
    [newPinnedResults[resultIndex], newPinnedResults[newIndex]] = [
      newPinnedResults[newIndex],
      newPinnedResults[resultIndex],
    ];
    setPinnedResults(newPinnedResults);
  };

  return {
    searchText,
    setSearchText,
    results,
    isQuerying,
    isShowingDetail,
    setIsShowingDetail,
    searchScope,
    setSearchScope,
    selectedItemId,
    setSelectedItemId,
    pinnedResults,
    plugins,
    resultIsPinned,
    toggleResultPinnedStatus,
    removeResultFromPinnedResults,
    movePinUp,
    movePinDown,
    hasCheckedPlugins,
    hasCheckedPreferences,
  };
}
