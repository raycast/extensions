import { useEffect, useRef, useState } from "react";
import { LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { FolderSearchPlugin, SpotlightSearchResult, SpotlightSearchPreferences } from "../types";
import { loadPlugins, lastUsedSort, shouldShowPath, log } from "../utils";
import { searchSpotlight } from "../search-spotlight";

// Global flag to avoid duplicate loading of plugins
let pluginsLoaded = false;

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
  const [showNonCloudLibraryPaths, setShowNonCloudLibraryPaths] = useState(false);

  const abortable = useRef<AbortController>(new AbortController());
  const searchTextRef = useRef<string>(searchText);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedText = useRef<string>("");

  // Update ref when searchText changes
  useEffect(() => {
    searchTextRef.current = searchText;
  }, [searchText]);

  // Log search text changes only when plugins and preferences are checked
  useEffect(() => {
    if (hasCheckedPlugins && hasCheckedPreferences) {
      log("debug", "useFolderSearch", "Search text update", { searchText });
    }
  }, [searchText, hasCheckedPlugins, hasCheckedPreferences]);

  // debounce search
  useEffect(() => {
    if (!hasCheckedPlugins || !hasCheckedPreferences) return;

    log("debug", "useFolderSearch", "Search text changed", {
      searchText,
      searchScope,
      hasCheckedPlugins,
      hasCheckedPreferences,
    });

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer
    debounceTimerRef.current = setTimeout(() => {
      // Only proceed if the text hasn't changed during the delay
      if (searchTextRef.current === searchText) {
        if (searchScope === "pinned") {
          log("debug", "useFolderSearch", "Filtering pinned results", {
            searchText,
            pinnedCount: pinnedResults.length,
          });
          setResults(
            pinnedResults.filter((pin) =>
              pin.kMDItemFSName.toLocaleLowerCase().includes(searchText.replace(/[[|\]]/gi, "").toLocaleLowerCase())
            )
          );
          setIsQuerying(false);
        } else if (searchText) {
          log("debug", "useFolderSearch", "Starting search", {
            searchText,
            searchScope,
          });
          setIsQuerying(true);
        } else if (lastProcessedText.current.length > 0) {
          // Only clear results if we previously had search text
          log("debug", "useFolderSearch", "Clearing results - no search text", {
            searchScope,
          });
          setIsQuerying(false);
          setResults([]);
        }
        lastProcessedText.current = searchText;
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchText, searchScope, pinnedResults, hasCheckedPlugins, hasCheckedPreferences]);

  // check plugins
  usePromise(
    async () => {
      // Avoid duplicate loading of plugins across multiple hook instances
      if (pluginsLoaded) {
        return await loadPlugins(); // This will get from cache
      }

      try {
        log("debug", "useFolderSearch", "Loading plugins for the first time");
        
        // Use the cached/optimized loadPlugins function
        const plugins = await loadPlugins();
        pluginsLoaded = true;
        return plugins;
      } catch (error) {
        log("error", "useFolderSearch", "Error loading plugins", {
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    [],
    {
      onData(plugins) {
        setPlugins(plugins);
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
      try {
        log("debug", "useFolderSearch", "Loading preferences");
        
        // Get preferences from LocalStorage
        const maybePreferences = await LocalStorage.getItem(`${environment.extensionName}-preferences`);

        if (maybePreferences) {
          try {
            const preferences = JSON.parse(maybePreferences as string);
            log("debug", "useFolderSearch", `Loaded preferences with ${preferences?.pinned?.length || 0} pins`);
            return preferences;
          } catch (error) {
            log("error", "useFolderSearch", "Error parsing preferences from storage");
          }
        }
        
        // Return empty object if nothing found
        return {};
      } catch (error) {
        log("error", "useFolderSearch", "Error loading preferences");
        throw error;
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

      try {
        await LocalStorage.setItem(
          `${environment.extensionName}-preferences`,
          JSON.stringify({
            pinned: pinnedResults,
            searchScope,
            isShowingDetail,
            showNonCloudLibraryPaths,
          })
        );
        
        // Only log on significant pin count changes
        if (pinnedResults.length % 5 === 0) {
          log("debug", "useFolderSearch", `Saved preferences with ${pinnedResults.length} pins`);
        }
      } catch (error) {
        log("error", "useFolderSearch", "Error saving preferences");
      }
    })();
  }, [pinnedResults, searchScope, isShowingDetail, hasCheckedPlugins, hasCheckedPreferences, showNonCloudLibraryPaths]);

  // perform search
  usePromise(
    async (search: string, scope: string, abortable: React.MutableRefObject<AbortController | null | undefined>) => {
      log("debug", "useFolderSearch", "Executing search promise", {
        search,
        scope,
        abortable: !!abortable?.current,
      });

      try {
        const results = await searchSpotlight(search, scope as "pinned" | "user" | "all", abortable);
        log("debug", "useFolderSearch", "Search promise completed", {
          resultCount: results.length,
        });
        return results;
      } catch (error) {
        // Ignore AbortError as it's expected during debouncing
        if (error instanceof Error && error.name === "AbortError") {
          return [];
        }
        throw error;
      }
    },
    [searchText, searchScope, abortable],
    {
      onWillExecute: () => {
        if (searchText && searchScope !== "pinned") {
          log("debug", "useFolderSearch", "Preparing to execute search", {
            searchText,
            searchScope,
          });
          setIsQuerying(true);
          setResults([]);
        }
      },
      onData: (data: SpotlightSearchResult[]) => {
        const { filterLibraryFolders } = getPreferenceValues<SpotlightSearchPreferences>();
        const filteredResults = data.filter((result) => shouldShowPath(result.path, !filterLibraryFolders));

        log("debug", "useFolderSearch", "Processing search results", {
          originalCount: data.length,
          filteredCount: filteredResults.length,
          filterLibraryFolders,
        });

        setResults(filteredResults.sort(lastUsedSort));
        setIsQuerying(false);
      },
      onError: (e) => {
        log("error", "useFolderSearch", "Search error", {
          error: e,
          searchText,
          searchScope,
        });
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
    log("debug", "useFolderSearch", `${resultIsPinned(result) ? "Unpinning" : "Pinning"} folder: ${result.path.split('/').pop()}`);
    
    if (!resultIsPinned(result)) {
      setPinnedResults((prevPins) => [result, ...prevPins]);
    } else {
      removeResultFromPinnedResults(result);
    }
    
    setSelectedItemId(`result-${resultIndex.toString()}`);
  };

  // Function to refresh pins from storage
  const refreshPinsFromStorage = async () => {
    log("debug", "useFolderSearch", "Refreshing pins from storage");
    
    try {
      // Get the current preferences from localStorage
      const maybePreferences = await LocalStorage.getItem(`${environment.extensionName}-preferences`);
      
      if (maybePreferences) {
        try {
          const preferences = JSON.parse(maybePreferences as string);
          
          // Ensure we have valid pinned items
          if (preferences?.pinned && Array.isArray(preferences.pinned)) {
            // Update state through React state setter
            setPinnedResults(preferences.pinned);
            log("debug", "useFolderSearch", `Updated pins from storage (${preferences.pinned.length} pins)`);
            
            // If we're in pinned scope, we need to update the results too
            if (searchScope === "pinned") {
              setResults(
                preferences.pinned.filter((pin: SpotlightSearchResult) =>
                  pin.kMDItemFSName.toLocaleLowerCase().includes(searchText.replace(/[[|\]]/gi, "").toLocaleLowerCase())
                )
              );
            }
          } else {
            log("debug", "useFolderSearch", "No valid pinned items found in preferences");
          }
        } catch (error) {
          log("error", "useFolderSearch", "Error parsing preferences during refresh");
        }
      } else {
        log("debug", "useFolderSearch", "No preferences found in storage");
      }
    } catch (error) {
      log("error", "useFolderSearch", "Error refreshing pins from storage");
    }
  };

  const movePinUp = (result: SpotlightSearchResult, resultIndex: number) => {
    try {
      log("debug", "useFolderSearch", "Moving pin up", {
        resultPath: result.path,
        currentIndex: resultIndex,
        newIndex: resultIndex - 1,
      });

      const newIndex = resultIndex - 1;
      if (newIndex < 0) {
        log("debug", "useFolderSearch", "Cannot move pin up - already at top", {
          resultPath: result.path,
          currentIndex: resultIndex,
        });
        return;
      }

      const newPinnedResults = [...pinnedResults];
      [newPinnedResults[resultIndex], newPinnedResults[newIndex]] = [
        newPinnedResults[newIndex],
        newPinnedResults[resultIndex],
      ];
      setPinnedResults(newPinnedResults);

      log("debug", "useFolderSearch", "Successfully moved pin up", {
        resultPath: result.path,
        oldIndex: resultIndex,
        newIndex,
      });
    } catch (error) {
      log("error", "useFolderSearch", "Error moving pin up", {
        error,
        resultPath: result.path,
        currentIndex: resultIndex,
      });
      showFailureToast(error, { title: "Error moving item up" });
    }
  };

  const movePinDown = (result: SpotlightSearchResult, resultIndex: number) => {
    try {
      log("debug", "useFolderSearch", "Moving pin down", {
        resultPath: result.path,
        currentIndex: resultIndex,
        newIndex: resultIndex + 1,
      });

      const newIndex = resultIndex + 1;
      if (newIndex >= pinnedResults.length) {
        log("debug", "useFolderSearch", "Cannot move pin down - already at bottom", {
          resultPath: result.path,
          currentIndex: resultIndex,
        });
        return;
      }

      const newPinnedResults = [...pinnedResults];
      [newPinnedResults[resultIndex], newPinnedResults[newIndex]] = [
        newPinnedResults[newIndex],
        newPinnedResults[resultIndex],
      ];
      setPinnedResults(newPinnedResults);

      log("debug", "useFolderSearch", "Successfully moved pin down", {
        resultPath: result.path,
        oldIndex: resultIndex,
        newIndex,
      });
    } catch (error) {
      log("error", "useFolderSearch", "Error moving pin down", {
        error,
        resultPath: result.path,
        currentIndex: resultIndex,
      });
      showFailureToast(error, { title: "Error moving item down" });
    }
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
    refreshPinsFromStorage,
  };
}
