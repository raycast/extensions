import { useState, useEffect, useCallback, useRef } from "react";
import { PanelsByDocId } from "./types";
import { getDocumentPanels } from "./granolaApi";
import { toError } from "./errorUtils";

/**
 * Hook for lazy-loading document panels from API
 * Only fetches panels when documentId is provided
 * @param documentId - The document ID to load panels for, or null/undefined to skip loading
 * @returns Object with panels data, loading state, error state, and refresh function
 */
export function useDocumentPanels(documentId: string | null | undefined): {
  panels: PanelsByDocId | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} {
  const [panels, setPanels] = useState<PanelsByDocId | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadPanels = useCallback(async () => {
    if (!documentId) {
      setPanels(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setIsLoading(true);
    setError(null);

    try {
      const fetchedPanels = await getDocumentPanels(documentId, signal);

      if (!signal.aborted) {
        setPanels(fetchedPanels);
      }
    } catch (err) {
      if (!signal.aborted) {
        setError(toError(err));
        setPanels(null);
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [documentId]);

  useEffect(() => {
    loadPanels();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [loadPanels]);

  return {
    panels,
    isLoading,
    error,
    refresh: loadPanels,
  };
}
