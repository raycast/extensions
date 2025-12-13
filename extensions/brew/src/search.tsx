/**
 * Search command for browsing and searching brew packages.
 */

import { useEffect, useRef, useState } from "react";
import { Color, Icon, List, showToast, Toast } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useBrewInstalled } from "./hooks/useBrewInstalled";
import { useBrewSearch, isInstalled } from "./hooks/useBrewSearch";
import type { FileDownloadProgress } from "./hooks/useBrewSearch";
import { InstallableFilterDropdown, InstallableFilterType, placeholder } from "./components/filter";
import { FormulaList } from "./components/list";

/**
 * Format bytes to human-readable string (e.g., "12.5 MB")
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Format a number with commas (e.g., 8081 -> "8,081")
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Get subtitle text showing download progress (left side)
 */
function getDownloadSubtitle(progress: FileDownloadProgress, isProcessing: boolean): string {
  if (progress.complete) {
    return "";
  }
  if (isProcessing && progress.itemsProcessed > 0) {
    return `${formatNumber(progress.itemsProcessed)} processed`;
  }
  if (isProcessing) {
    return "Processing...";
  }
  if (!progress.started) {
    return "";
  }
  // Show download progress: "15% downloaded (4.6 MB)"
  if (progress.bytesDownloaded > 0) {
    const downloaded = formatBytes(progress.bytesDownloaded);
    // Cap percent at 100 to avoid display issues
    const percent = progress.percent > 0 ? Math.min(progress.percent, 100) : 0;
    if (percent > 0) {
      return `${percent}% downloaded (${downloaded})`;
    }
    return `${downloaded} downloaded`;
  }
  return "Starting...";
}

/**
 * Get accessory text showing total size or status (right side)
 */
function getDownloadAccessory(progress: FileDownloadProgress, isProcessing: boolean, itemType: string): string {
  if (progress.complete && progress.totalItems > 0) {
    return `${formatNumber(progress.totalItems)} ${itemType}`;
  }
  if (progress.complete) {
    return "Done";
  }
  if (isProcessing && progress.itemsProcessed > 0 && progress.totalItems > 0) {
    return `${formatNumber(progress.itemsProcessed)} of ${formatNumber(progress.totalItems)} ${itemType}`;
  }
  if (isProcessing) {
    return "Processing...";
  }
  if (!progress.started) {
    return "Waiting";
  }
  // Show total file size: "29.4 MB Total"
  if (progress.totalBytes > 0) {
    return `${formatBytes(progress.totalBytes)} Total`;
  }
  return "Downloading...";
}

/**
 * Get the icon for a download step based on progress
 * @param progress - The download progress
 * @param isProcessing - Whether we're currently processing this file
 */
function getDownloadIcon(progress: FileDownloadProgress, isProcessing = false) {
  if (progress.complete) {
    return { source: Icon.CheckCircle, tintColor: Color.Green };
  }
  if (isProcessing) {
    // Show animated progress icon during processing with dynamic color
    return getProgressIcon(0.9, Color.PrimaryText);
  }
  if (!progress.started) {
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
  // Show progress icon with actual percentage (capped at 100%) and dynamic color
  const percent = progress.percent > 0 ? Math.min(progress.percent, 100) : 0;
  const fraction = percent > 0 ? percent / 100 : 0.05;
  return getProgressIcon(fraction, Color.PrimaryText);
}

export default function SearchView() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState(InstallableFilterType.all);

  const { isLoading: isLoadingInstalled, data: installed, revalidate: revalidateInstalled } = useBrewInstalled();

  // useBrewSearch automatically applies installed status via useMemo
  // whenever either search results or installed data changes
  const {
    isLoading: isLoadingSearch,
    hasCacheFiles,
    loadingState,
    data: results,
    indexTotals,
  } = useBrewSearch({
    searchText,
    installed,
  });

  const formulae = filter != InstallableFilterType.casks ? (results?.formulae ?? []) : [];
  const casks = filter != InstallableFilterType.formulae ? (results?.casks ?? []) : [];

  // Track if we've shown the completion toast (persists across renders)
  const hasShownCompletionToast = useRef(false);

  // Extract primitive for stable dependency (avoids render loops from object changes)
  const phase = loadingState.phase;

  // Show completion toast when download AND processing are fully complete
  // Wait for phase === "complete" to ensure we have accurate totals
  useEffect(() => {
    if (phase === "complete" && !hasShownCompletionToast.current && results) {
      hasShownCompletionToast.current = true;
      // Use indexTotals for accurate counts (total packages in index, not filtered results)
      const totalFormulae = indexTotals?.formulae || 0;
      const totalCasks = indexTotals?.casks || 0;
      showToast({
        style: Toast.Style.Success,
        title: "Package Index Ready",
        message: `${formatNumber(totalFormulae)} formulae and ${formatNumber(totalCasks)} casks loaded`,
      });
    }
  }, [phase, results]);

  // Determine which loading UI to show during initial load:
  // - hasCacheFiles === null: Still checking if cache exists, show simple loading
  // - hasCacheFiles === true: Cache exists (warm start), show normal list with spinner
  // - hasCacheFiles === false: No cache (cold start), show download progress UI

  // While checking cache existence, show a simple loading state
  if (loadingState.isInitialLoad && hasCacheFiles === null) {
    return (
      <List navigationTitle="Search" searchBarPlaceholder="Checking cache..." isLoading={true}>
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Loading..." />
      </List>
    );
  }

  // Show download progress UI only when cache files don't exist (first run / cold start)
  // Keep showing until phase is "complete" to ensure user sees full download and processing progress
  const showDownloadProgress = hasCacheFiles === false && phase !== "complete";

  if (showDownloadProgress) {
    const { phase, casksProgress, formulaeProgress } = loadingState;

    // Cold start: show detailed download progress
    // Detect processing state: download is at 100% (or bytes match) but phase hasn't moved on
    // This happens because processing takes a long time after download completes
    // Handle edge case where percent is -1 (unknown total) by checking bytes directly
    const isCasksDownloadDone =
      casksProgress.percent >= 100 ||
      (casksProgress.bytesDownloaded > 0 &&
        casksProgress.totalBytes > 0 &&
        casksProgress.bytesDownloaded >= casksProgress.totalBytes);
    const isFormulaeDownloadDone =
      formulaeProgress.percent >= 100 ||
      (formulaeProgress.bytesDownloaded > 0 &&
        formulaeProgress.totalBytes > 0 &&
        formulaeProgress.bytesDownloaded >= formulaeProgress.totalBytes);

    const isProcessingCasks = phase === "casks" && isCasksDownloadDone && !casksProgress.complete;
    const isProcessingFormulae = phase === "formulae" && isFormulaeDownloadDone && !formulaeProgress.complete;

    // Formulae haven't started yet if we're still in casks phase
    const formulaeNotStarted = phase === "casks";

    // Build status message for search bar (simple, no counts)
    let statusMessage = "Loading package index...";
    if (isProcessingCasks) {
      statusMessage = "Processing casks...";
    } else if (isProcessingFormulae) {
      statusMessage = "Processing formulae...";
    } else if (phase === "casks" && casksProgress.percent > 0) {
      statusMessage = `Downloading casks... ${Math.min(casksProgress.percent, 100)}%`;
    } else if (phase === "formulae" && formulaeProgress.percent > 0) {
      statusMessage = `Downloading formulae... ${Math.min(formulaeProgress.percent, 100)}%`;
    } else if (phase === "casks") {
      statusMessage = "Downloading casks...";
    } else if (phase === "formulae") {
      statusMessage = "Downloading formulae...";
    } else if (phase === "parsing") {
      statusMessage = "Processing package data...";
    }

    // Build casks subtitle - show download progress on left
    const casksSubtitle = getDownloadSubtitle(casksProgress, isProcessingCasks);

    // Build formulae subtitle - empty when waiting, otherwise show progress
    const formulaeSubtitle = formulaeNotStarted ? "" : getDownloadSubtitle(formulaeProgress, isProcessingFormulae);

    // Build formulae title based on state
    let formulaeTitle = "Download Formulae";
    if (isProcessingFormulae) {
      formulaeTitle = "Processing Formulae";
    } else if (!formulaeNotStarted && formulaeProgress.started) {
      formulaeTitle = "Downloading Formulae";
    }

    // Build formulae accessory text (right side)
    let formulaeAccessoryText = "Waiting";
    if (formulaeNotStarted) {
      formulaeAccessoryText = isProcessingCasks ? "Waiting on Casks processing..." : "Waiting on Casks to finish...";
    } else {
      formulaeAccessoryText = getDownloadAccessory(formulaeProgress, isProcessingFormulae, "formulae");
    }

    // Build formulae icon - show empty circle if not started
    const formulaeIcon = formulaeNotStarted
      ? { source: Icon.Circle, tintColor: Color.SecondaryText }
      : getDownloadIcon(formulaeProgress, isProcessingFormulae);

    return (
      <List navigationTitle="First-time setup" searchBarPlaceholder={statusMessage} isLoading={true}>
        <List.Section title="Initializing...">
          <List.Item
            icon={getDownloadIcon(casksProgress, isProcessingCasks)}
            title={isProcessingCasks ? "Processing Casks" : "Downloading Casks"}
            subtitle={casksSubtitle}
            accessories={[{ text: getDownloadAccessory(casksProgress, isProcessingCasks, "casks") }]}
          />
          <List.Item
            icon={formulaeIcon}
            title={formulaeTitle}
            subtitle={formulaeSubtitle}
            accessories={[{ text: formulaeAccessoryText }]}
          />
        </List.Section>
      </List>
    );
  }

  return (
    <FormulaList
      formulae={formulae}
      casks={casks}
      searchBarPlaceholder={placeholder(filter)}
      searchBarAccessory={<InstallableFilterDropdown onSelect={setFilter} />}
      isLoading={isLoadingInstalled || isLoadingSearch}
      onSearchTextChange={(searchText) => setSearchText(searchText.trim())}
      filtering={false}
      isInstalled={(name) => isInstalled(name, installed)}
      onAction={() => revalidateInstalled()}
      dataFetched={loadingState.phase === "complete"}
    />
  );
}
