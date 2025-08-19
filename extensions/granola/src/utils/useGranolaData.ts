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

  // Load panels from cache asynchronously
  useEffect(() => {
    async function loadPanels() {
      try {
        setIsLoadingPanels(true);
        const cacheData = await getCache();
        const extractedPanels = extractPanelsFromCache(cacheData);
        setPanels(extractedPanels);
      } catch (error) {
        console.error("[useGranolaData] Failed to load panels:", error);
        setPanels(null);
      } finally {
        setIsLoadingPanels(false);
      }
    }

    loadPanels();
  }, []);

  try {
    const noteData = fetchGranolaData("get-documents") as NoteData;

    // Check loading state - consider both notes and panels loading
    const isLoading = noteData.isLoading === true || isLoadingPanels;

    if (!noteData?.data && noteData.isLoading === true) {
      return {
        noteData,
        panels,
        isLoading,
        hasError: false,
      };
    }

    // Check for no data state
    if (!noteData?.data && noteData.isLoading === false) {
      return {
        noteData,
        panels,
        isLoading: isLoadingPanels, // Still might be loading panels
        hasError: true,
        error: new Error("No data available"),
      };
    }

    // Success state (panels may still be loading)
    return {
      noteData,
      panels,
      isLoading,
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
