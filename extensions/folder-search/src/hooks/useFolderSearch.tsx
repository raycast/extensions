import { useEffect, useRef, useState } from "react";
import { LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { usePromise, showFailureToast } from "@raycast/utils";
import { FolderSearchPlugin, SpotlightSearchResult, SpotlightSearchPreferences } from "../types";
import { loadPlugins, lastUsedSort, shouldShowPath, log } from "../utils";
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
  const pluginsRef = useRef<FolderSearchPlugin[]>([]);
  const isLoadingPluginsRef = useRef<boolean>(false);

  usePromise(
    async () => {
      // Return cached plugins if available
      if (pluginsRef.current.length > 0) {
        log("debug", "useFolderSearch", "Using cached plugins", {
          count: pluginsRef.current.length,
          component: "useFolderSearch",
          timestamp: new Date().toISOString(),
        });
        return pluginsRef.current;
      }

      // If already loading, wait for the existing call to complete
      if (isLoadingPluginsRef.current) {
        log("debug", "useFolderSearch", "Plugin loading already in progress", {
          component: "useFolderSearch",
          timestamp: new Date().toISOString(),
        });

        // Wait for the current loading process to complete
        while (isLoadingPluginsRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Return the cached plugins after waiting
        if (pluginsRef.current.length > 0) {
          return pluginsRef.current;
        }
      }

      // Set loading flag and load plugins
      isLoadingPluginsRef.current = true;
      try {
        log("debug", "useFolderSearch", "Loading plugins from loadPlugins", {
          component: "useFolderSearch",
          timestamp: new Date().toISOString(),
        });
        const plugins = await loadPlugins();
        pluginsRef.current = plugins;
        return plugins;
      } finally {
        isLoadingPluginsRef.current = false;
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
  const prefsRef = useRef<boolean>(false);
  const isLoadingPrefsRef = useRef<boolean>(false);
  // Track if this is the first time loading to avoid duplicate loads on mount
  const initialPrefLoadRef = useRef<boolean>(false);

  usePromise(
    async () => {
      // Skip after initial load is complete
      if (initialPrefLoadRef.current && prefsRef.current) {
        return;
      }

      // If already loading, wait for the existing call to complete
      if (isLoadingPrefsRef.current) {
        // Wait for the current loading process to complete
        while (isLoadingPrefsRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Return after waiting since preferences should be checked
        if (prefsRef.current) {
          initialPrefLoadRef.current = true;
          return;
        }
      }

      // Set loading flag and load preferences
      isLoadingPrefsRef.current = true;
      try {
        const maybePreferences = await LocalStorage.getItem(`${environment.extensionName}-preferences`);

        if (maybePreferences) {
          try {
            initialPrefLoadRef.current = true;
            return JSON.parse(maybePreferences as string);
          } catch (_) {
            // noop
          }
        }
      } finally {
        isLoadingPrefsRef.current = false;
      }
    },
    [],
    {
      onData(preferences) {
        prefsRef.current = true;
        setPinnedResults(preferences?.pinned || []);
        setSearchScope(preferences?.searchScope || "");
        setIsShowingDetail(preferences?.isShowingDetail);
        setShowNonCloudLibraryPaths(preferences?.showNonCloudLibraryPaths || false);
        setHasCheckedPreferences(true);
      },
      onError() {
        prefsRef.current = true;
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
    console.log(`[DEBUG] useFolderSearch.tsx: toggleResultPinnedStatus called for ${result.path}`);
    const isPinned = resultIsPinned(result);
    
    console.log(`[DEBUG] useFolderSearch.tsx: ${isPinned ? "Removing from" : "Adding to"} pins: ${result.path}`);
    
    setPinnedResults((prevPins) => {
      // For adding: place at the beginning, for removing: filter out
      const newPins = isPinned 
        ? prevPins.filter((pinnedResult) => pinnedResult.path !== result.path)
        : [result, ...prevPins];
        
      console.log(`[DEBUG] useFolderSearch.tsx: New pins count: ${newPins.length}`);
      
      // Immediately persist to localStorage
      (async () => {
        try {
          await LocalStorage.setItem(
            `${environment.extensionName}-preferences`,
            JSON.stringify({
              pinned: newPins,
              searchScope,
              isShowingDetail,
              showNonCloudLibraryPaths,
            })
          );
          console.log(`[DEBUG] useFolderSearch.tsx: Saved updated pins to localStorage`);
        } catch (error) {
          console.error("Error saving pins", error);
        }
      })();
      
      return newPins;
    });
    
    setSelectedItemId(`result-${resultIndex.toString()}`);
  };

  // Simple function to refresh pins from storage
  const refreshPinsFromStorage = async () => {
    console.log(`[DEBUG] useFolderSearch.tsx: refreshPinsFromStorage called, current pins count: ${pinnedResults.length}`);
    
    try {
      // Get the current preferences from localStorage
      const maybePreferences = await LocalStorage.getItem(`${environment.extensionName}-preferences`);
      console.log(`[DEBUG] useFolderSearch.tsx: Got preferences from storage: ${maybePreferences ? "yes" : "no"}`);
      
      if (maybePreferences) {
        try {
          const preferences = JSON.parse(maybePreferences as string);
          console.log(`[DEBUG] useFolderSearch.tsx: Parsed preferences, pinned items: ${preferences?.pinned?.length || 0}`);
          
          // Ensure we have valid pinned items
          if (preferences?.pinned && Array.isArray(preferences.pinned)) {
            console.log(`[DEBUG] useFolderSearch.tsx: Valid pinned items array with ${preferences.pinned.length} items`);
            
            // Force updating the state with the latest pins
            setPinnedResults([...preferences.pinned]);
            console.log(`[DEBUG] useFolderSearch.tsx: Set pinned results to ${preferences.pinned.length} items`);
            
            // If we're in pinned scope, we need to update the results too
            if (searchScope === "pinned") {
              console.log(`[DEBUG] useFolderSearch.tsx: In pinned scope, updating results too`);
              setResults(
                preferences.pinned.filter((pin: SpotlightSearchResult) =>
                  pin.kMDItemFSName.toLocaleLowerCase().includes(searchText.replace(/[[|\]]/gi, "").toLocaleLowerCase())
                )
              );
            }
          } else {
            console.log(`[DEBUG] useFolderSearch.tsx: No valid pinned items found in preferences`);
          }
        } catch (error) {
          console.error("Error parsing preferences during refresh", error);
        }
      } else {
        console.log(`[DEBUG] useFolderSearch.tsx: No preferences found in storage`);
      }
    } catch (error) {
      console.error("Error refreshing pins from storage", error);
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
