import { useEffect, useRef, useState } from "react";
import { LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { showFailureToast } from "@raycast/utils";
import { FolderSearchPlugin, SpotlightSearchResult, SpotlightSearchPreferences } from "../types";
import { loadPlugins, lastUsedSort, shouldShowPath } from "../utils";
import { searchSpotlight } from "../search-spotlight";

export function useFolderSearch() {
  const [searchText, setSearchText] = useState<string>("");
  const [pinnedResults, setPinnedResults] = useState<SpotlightSearchResult[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchScope, setSearchScope] = useState<string>("");
  const [isShowingDetail, setIsShowingDetail] = useState<boolean>(false);
  const [results, setResults] = useState<SpotlightSearchResult[]>([]);
  const [plugins, setPlugins] = useState<FolderSearchPlugin[]>([]);
  const [isQuerying, setIsQuerying] = useState<boolean>(false);
  const [hasCheckedPlugins, setHasCheckedPlugins] = useState<boolean>(false);
  const [hasCheckedPreferences, setHasCheckedPreferences] = useState<boolean>(false);
  const [showNonCloudLibraryPaths, setShowNonCloudLibraryPaths] = useState(false);

  const abortable = useRef<AbortController>();
  const searchCallback = useRef((result: SpotlightSearchResult) => {
    const { filterLibraryFolders } = getPreferenceValues();
    // Only add the result if it passes our visibility filter
    if (shouldShowPath(result.path, !filterLibraryFolders)) {
      setResults((prevResults) => [...prevResults, result].sort(lastUsedSort));
    }
  });

  const searchTextRef = useRef(searchText);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedText = useRef("");

  // check plugins
  useEffect(() => {
    const loadPluginsAndPreferences = async () => {
      try {
        const loadedPlugins = await loadPlugins();
        setPlugins(loadedPlugins);
        setHasCheckedPlugins(true);
      } catch (e) {
        showFailureToast(e, { title: "Error loading plugins" });
        setHasCheckedPlugins(true);
      }
    };

    loadPluginsAndPreferences();
  }, []);

  // check prefs
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await getPreferenceValues<SpotlightSearchPreferences>();
        setShowNonCloudLibraryPaths(preferences.showNonCloudLibraryPaths);
        setPinnedResults(preferences.pinned || []);
        setSearchScope(preferences.searchScope || "");
        setIsShowingDetail(preferences.isShowingDetail);
        setHasCheckedPreferences(true);
      } catch (e) {
        showFailureToast(e, { title: "Error loading preferences" });
        setHasCheckedPreferences(true);
      }
    };

    loadPreferences();
  }, []);

  // Save preferences
  useEffect(() => {
    if (!(hasCheckedPlugins && hasCheckedPreferences)) {
      return;
    }
    LocalStorage.setItem(
      `${environment.extensionName}-preferences`,
      JSON.stringify({
        pinned: pinnedResults,
        searchScope,
        isShowingDetail,
        showNonCloudLibraryPaths,
      })
    );
  }, [pinnedResults, searchScope, isShowingDetail, hasCheckedPlugins, hasCheckedPreferences, showNonCloudLibraryPaths]);

  // perform search
  usePromise(searchSpotlight, [searchText, searchScope, abortable, searchCallback.current], {
    onWillExecute: () => {
      setIsQuerying(true);
      setResults([]);
    },
    onData: () => {
      setIsQuerying(false);
    },
    onError: (e) => {
      if (e.name !== "AbortError") {
        showFailureToast(e, { title: "Error searching folders" });
      }
      setIsQuerying(false);
    },
    execute: hasCheckedPlugins && hasCheckedPreferences && !!searchText && searchScope !== "pinned",
    abortable,
  });

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
