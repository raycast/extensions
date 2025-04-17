import { useEffect, useRef, useState } from "react";
import { LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { FolderSearchPlugin, SpotlightSearchResult, SpotlightSearchPreferences } from "../types";
import { loadPlugins, lastUsedSort, shouldShowPath } from "../utils";
import { searchSpotlight } from "../search-spotlight";
import { log } from "../utils/logger";

export function useFolderSearch() {
  const [searchText, setSearchText] = useState<string>("");
  const [pinnedResults, setPinnedResults] = useState<SpotlightSearchResult[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [searchScope, setSearchScope] = useState<string>("");
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(true);
  const [results, setResults] = useState<SpotlightSearchResult[]>([]);
  const [plugins, setPlugins] = useState<FolderSearchPlugin[]>([]);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [hasCheckedPlugins, setHasCheckedPlugins] = useState<boolean>(false);
  const [hasCheckedPreferences, setHasCheckedPreferences] = useState<boolean>(false);
  const [showNonCloudLibraryPaths, setShowNonCloudLibraryPaths] = useState<boolean>(false);

  const abortable = useRef<AbortController>();
  const searchTextRef = useRef<string>(searchText);
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const lastProcessedText = useRef<string>("");

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
        if (searchScope === "pinned") {
          setResults(
            pinnedResults.filter((pin) =>
              pin.kMDItemFSName.toLocaleLowerCase().includes(searchText.replace(/[[|\]]/gi, "").toLocaleLowerCase())
            )
          );
          setIsQuerying(false);
        } else if (searchText) {
          setIsQuerying(true);
        } else {
          setIsQuerying(false);
        }
        lastProcessedText.current = searchText;
      }
    }, 300);

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
        showFailureToast({ title: "Could not read plugins" });
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
        setShowNonCloudLibraryPaths(preferences?.showNonCloudLibraryPaths || false);
        setHasCheckedPreferences(true);
      },
      onError() {
        showFailureToast({ title: "Could not read preferences" });
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
          showNonCloudLibraryPaths,
        })
      );
    })();
  }, [pinnedResults, searchScope, isShowingDetail, hasCheckedPlugins, hasCheckedPreferences, showNonCloudLibraryPaths]);

  // perform search
  usePromise(
    async (search: string, scope: string, abortable: React.MutableRefObject<AbortController | null | undefined>) => {
      log('debug', 'usePromise', 'Starting search', { text: search, scope });
      
      const results = await searchSpotlight(search, scope as "pinned" | "user" | "all", abortable);
      
      log('debug', 'usePromise', 'Search completed', { resultCount: results.length });
      
      return results;
    },
    [searchText, searchScope, abortable],
    {
      onWillExecute: () => {
        if (searchText && searchScope !== "pinned") {
          setIsQuerying(true);
          setResults([]);
        }
      },
      onData: (data: SpotlightSearchResult[]) => {
        const { filterLibraryFolders } = getPreferenceValues<SpotlightSearchPreferences>();
        const filteredResults = data.filter(result => shouldShowPath(result.path, !filterLibraryFolders));
        
        log('debug', 'usePromise', 'Filtering results', {
          originalCount: data.length,
          filteredCount: filteredResults.length
        });
        
        setResults(filteredResults.sort(lastUsedSort));
        setIsQuerying(false);
      },
      onError: (e) => {
        log('error', 'usePromise', 'Search error', { error: e });
        if (e.name !== "AbortError") {
          showFailureToast(e, { title: "Error searching folders" });
        }
        setIsQuerying(false);
      },
      execute: hasCheckedPlugins && hasCheckedPreferences && !!searchText && searchScope !== "pinned",
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
    results: searchScope === "pinned" ? pinnedResults : results,
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
    showNonCloudLibraryPaths,
  };
}
