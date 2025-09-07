import { fetchGranolaData } from "./fetchData";
import { NoteData, PanelsByDocId } from "./types";
import getCache from "./getCache";
import { useState, useEffect } from "react";

function extractPanelsFromCache(cache: unknown): PanelsByDocId | null {
  if (typeof cache !== "object" || cache === null) return null;
  const maybeState = (cache as { state?: unknown }).state;
  if (typeof maybeState !== "object" || maybeState === null) return null;
  const maybePanels = (maybeState as { documentPanels?: unknown }).documentPanels;
  if (typeof maybePanels !== "object" || maybePanels === null) return null;
  return maybePanels as PanelsByDocId;
}

export interface GranolaDataState {
  noteData: NoteData | null;
  panels: PanelsByDocId | null;
  isLoading: boolean;
  hasError: boolean;
  error?: Error;
}

/**
 * Shared hook for loading Granola notes and panel data
 * Consolidates the common pattern used across multiple command files
 */
export function useGranolaData(): GranolaDataState {
  const [panels, setPanels] = useState<PanelsByDocId | null>(null);
  const [isLoadingPanels, setIsLoadingPanels] = useState(true);

  // Load panels from cache synchronously in useEffect
  useEffect(() => {
    try {
      const cacheData = getCache();
      const extractedPanels = extractPanelsFromCache(cacheData);
      setPanels(extractedPanels);
    } catch {
      // Silently handle cache loading errors
      setPanels(null);
    } finally {
      setIsLoadingPanels(false);
    }
  }, []);

  try {
    const noteData = fetchGranolaData("get-documents") as NoteData;

    // Unified loading state
    const isLoading = noteData.isLoading === true || isLoadingPanels;

    // Handle loading state
    if (isLoading) {
      return {
        noteData,
        panels,
        isLoading: true,
        hasError: false,
      };
    }

    // Check for no data state
    if (!noteData?.data) {
      return {
        noteData,
        panels,
        isLoading: false,
        hasError: true,
        error: new Error("No data available"),
      };
    }

    // Success state
    return {
      noteData,
      panels,
      isLoading: false,
      hasError: false,
    };
  } catch (error) {
    return {
      noteData: null,
      panels: null,
      isLoading: false,
      hasError: true,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}
