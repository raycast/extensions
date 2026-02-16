/**
 * Search command for browsing and searching brew packages.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { useBrewInstalled } from "./hooks/useBrewInstalled";
import { useBrewSearch, isInstalled } from "./hooks/useBrewSearch";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "./components/filter";
import { FormulaList } from "./components/list";

interface SearchPreferences {
  showMetadataPanel?: boolean;
}

/**
 * Format a number with commas (e.g., 8081 -> "8,081")
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

export default function SearchView() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState(InstallableFilterType.all);
  const { showMetadataPanel } = getPreferenceValues<SearchPreferences>();

  const { isLoading: isLoadingInstalled, data: installed, revalidate: revalidateInstalled } = useBrewInstalled();

  // useBrewSearch automatically applies installed status via useMemo
  // whenever either search results or installed data changes
  const {
    isLoading: isLoadingSearch,
    hasCacheFiles,
    loadingState,
    data: results,
    indexTotals,
    downloadProgressRef,
  } = useBrewSearch({
    searchText,
    installed,
  });

  const formulae = filter != InstallableFilterType.casks ? (results?.formulae ?? []) : [];
  const casks = filter != InstallableFilterType.formulae ? (results?.casks ?? []) : [];

  // Memoize isInstalled callback to avoid creating a new function every render
  const isInstalledCallback = useCallback((name: string) => isInstalled(name, installed), [installed]);

  // Track toast reference for updating progress
  const initToastRef = useRef<Toast | null>(null);
  const isCreatingToastRef = useRef(false);
  const hasShownCompletionToast = useRef(false);
  // Track max progress seen to avoid jumps backwards
  const maxCasksPercentRef = useRef(0);
  const maxFormulaePercentRef = useRef(0);

  const phase = loadingState.phase;

  // Show initializing toast on cold start (no cache files)
  useEffect(() => {
    // Only show on cold start when we're still loading
    if (hasCacheFiles !== false || phase === "complete") {
      // Hide toast if it exists and we're done
      if (initToastRef.current) {
        initToastRef.current.hide();
        initToastRef.current = null;
      }
      // Reset max progress tracking for next cold start
      if (phase === "complete") {
        maxCasksPercentRef.current = 0;
        maxFormulaePercentRef.current = 0;
      }
      return;
    }

    if (!initToastRef.current && !isCreatingToastRef.current) {
      // Create the toast (prevent duplicate creation while promise is pending)
      isCreatingToastRef.current = true;
      showToast({
        style: Toast.Style.Animated,
        title: "Initializing...",
      }).then((toast) => {
        initToastRef.current = toast;
        isCreatingToastRef.current = false;
      });
    }

    // Poll progress ref to update toast without triggering re-renders
    const interval = setInterval(() => {
      if (!initToastRef.current) return;

      const progress = downloadProgressRef.current;
      const casksPercent = progress.casksProgress?.percent ?? 0;
      const formulaePercent = progress.formulaeProgress?.percent ?? 0;

      maxCasksPercentRef.current = Math.max(maxCasksPercentRef.current, Math.max(0, Math.min(100, casksPercent)));
      maxFormulaePercentRef.current = Math.max(
        maxFormulaePercentRef.current,
        Math.max(0, Math.min(100, formulaePercent)),
      );

      const combinedPercent = Math.round((maxCasksPercentRef.current + maxFormulaePercentRef.current) / 2);
      initToastRef.current.message = combinedPercent > 0 ? `${combinedPercent}%` : undefined;
    }, 250);

    return () => clearInterval(interval);
  }, [hasCacheFiles, phase]);

  // Show completion toast only on cold start when fully complete
  useEffect(() => {
    if (phase === "complete" && !hasShownCompletionToast.current && results && hasCacheFiles === false) {
      hasShownCompletionToast.current = true;
      const totalFormulae = indexTotals?.formulae || 0;
      const totalCasks = indexTotals?.casks || 0;
      showToast({
        style: Toast.Style.Success,
        title: "Package Index Ready",
        message: `${formatNumber(totalFormulae)} formulae and ${formatNumber(totalCasks)} casks loaded`,
      });
    }
  }, [phase, results, indexTotals, hasCacheFiles]);

  return (
    <FormulaList
      formulae={formulae}
      casks={casks}
      searchBarPlaceholder={placeholder(filter)}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      isLoading={(isLoadingInstalled && !installed) || isLoadingSearch}
      onSearchTextChange={(searchText) => setSearchText(searchText.trim())}
      filtering={false}
      isInstalled={isInstalledCallback}
      onAction={() => revalidateInstalled()}
      dataFetched={loadingState.phase === "complete"}
      showMetadataPanel={showMetadataPanel}
    />
  );
}
