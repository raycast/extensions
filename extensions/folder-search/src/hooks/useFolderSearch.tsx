import { useEffect, useRef, useState, useCallback } from "react";
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

  // Keep track of pending state updates
  const pendingPinUpdateRef = useRef<boolean>(false);

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
    log(
      "debug",
      "useFolderSearch",
      `${resultIsPinned(result) ? "Unpinning" : "Pinning"} folder: ${result.path.split("/").pop()}`
    );

    // Mark that we have a pin update in progress
    pendingPinUpdateRef.current = true;

    let newPins: SpotlightSearchResult[] = [];

    // Update state and capture the new pins
    if (!resultIsPinned(result)) {
      setPinnedResults((prevPins) => {
        newPins = [result, ...prevPins];
        return newPins;
      });
    } else {
      setPinnedResults((prevPins) => {
        newPins = prevPins.filter((pin) => pin.path !== result.path);
        return newPins;
      });
    }

    // Immediately save to localStorage
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
        log("debug", "useFolderSearch", `Immediately saved pin change to localStorage (${newPins.length} pins)`);

        // Small delay to ensure state has updated in React
        setTimeout(() => {
          pendingPinUpdateRef.current = false;
        }, 50);
      } catch (error) {
        log("error", "useFolderSearch", "Error saving pins");
        pendingPinUpdateRef.current = false;
      }
    })();

    setSelectedItemId(`result-${resultIndex.toString()}`);
  };

  // Function to refresh pins from storage
  const refreshPinsFromStorage = useCallback(() => {
    log("debug", "useFolderSearch", "Explicitly refreshing pins from storage");

    try {
      // When we have a pending update, always fetch directly from storage
      if (pendingPinUpdateRef.current) {
        log("debug", "useFolderSearch", "Pending pin update detected, reading directly from localStorage");

        LocalStorage.getItem(`${environment.extensionName}-preferences`)
          .then((maybePreferences) => {
            if (!maybePreferences) {
              log("debug", "useFolderSearch", "No preferences found in storage, clearing pins");
              setPinnedResults([]);
              pendingPinUpdateRef.current = false;
              return;
            }

            try {
              const preferences = JSON.parse(maybePreferences as string);
              const storedPins = preferences?.pinned || [];
              log("debug", "useFolderSearch", `Loaded ${storedPins.length} pins from preferences`);

              // Check if pins have actually changed
              const currentPaths = new Set(pinnedResults.map((pin) => pin.path));
              const storedPaths = new Set(storedPins.map((pin: SpotlightSearchResult) => pin.path));

              // Compare pin paths to determine if an update is needed
              let pathsChanged = false;

              if (currentPaths.size !== storedPaths.size) {
                pathsChanged = true;
              } else {
                // Check if any paths in storedPaths are not in currentPaths
                for (const pathStr of storedPaths) {
                  if (!currentPaths.has(String(pathStr))) {
                    pathsChanged = true;
                    break;
                  }
                }
              }

              if (pathsChanged) {
                log("debug", "useFolderSearch", "Pins changed, updating state");
                setPinnedResults(storedPins);
              } else {
                log("debug", "useFolderSearch", "Pins unchanged, skipping update");
              }
            } catch (e) {
              log("error", "useFolderSearch", "Error parsing stored pins", {
                error: e instanceof Error ? e.message : String(e),
              });
            } finally {
              pendingPinUpdateRef.current = false;
            }
          })
          .catch((e) => {
            log("error", "useFolderSearch", "Error reading preferences", {
              error: e instanceof Error ? e.message : String(e),
            });
            pendingPinUpdateRef.current = false;
          });

        return;
      }

      // Regular refresh path - check if we need to update based on preferences
      const currentPinPaths = new Set(pinnedResults.map((pin) => pin.path));

      // For the regular path, we just check if there are pinned folders in preferences
      LocalStorage.getItem(`${environment.extensionName}-preferences`)
        .then((maybePreferences) => {
          if (!maybePreferences) {
            log("debug", "useFolderSearch", "No preferences found in storage");
            return;
          }

          try {
            const preferences = JSON.parse(maybePreferences as string);
            const preferencesPins = preferences?.pinned || [];

            if (preferencesPins.length > 0) {
              log(
                "debug",
                "useFolderSearch",
                `Found ${preferencesPins.length} pins in preferences, current: ${pinnedResults.length}`
              );

              // Check if we need to update
              if (pinnedResults.length !== preferencesPins.length) {
                log("debug", "useFolderSearch", "Different pin count, updating from preferences");
                setPinnedResults(preferencesPins);
              } else {
                // Check if the pins are the same
                let needsUpdate = false;
                for (const pin of preferencesPins) {
                  if (!currentPinPaths.has(pin.path)) {
                    needsUpdate = true;
                    break;
                  }
                }

                if (needsUpdate) {
                  log("debug", "useFolderSearch", "Pin paths changed, updating from preferences");
                  setPinnedResults(preferencesPins);
                } else {
                  log("debug", "useFolderSearch", "Pins unchanged, no update needed");
                }
              }
            } else {
              log("debug", "useFolderSearch", "No pins in preferences");
            }
          } catch (e) {
            log("error", "useFolderSearch", "Error parsing preferences", {
              error: e instanceof Error ? e.message : String(e),
            });
          }
        })
        .catch((e) => {
          log("error", "useFolderSearch", "Error reading preferences", {
            error: e instanceof Error ? e.message : String(e),
          });
        });
    } catch (e) {
      log("error", "useFolderSearch", "Error refreshing pins", {
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }, [pinnedResults, setPinnedResults]);

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
