import { useState, useEffect, useCallback, useRef } from "react";
import { getDocumentNotesMarkdown } from "./granolaApi";
import { toError } from "./errorUtils";

/**
 * Hook for lazy-loading notes_markdown from API
 * Only fetches when documentId is provided
 * @param documentId - The document ID to load notes_markdown for, or null/undefined to skip loading
 * @returns Object with notes_markdown data, loading state, error state, and refresh function
 */
export function useDocumentNotesMarkdown(documentId: string | null | undefined): {
  notesMarkdown: string | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
} {
  const [notesMarkdown, setNotesMarkdown] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const requestIdRef = useRef(0);

  const loadNotesMarkdown = useCallback(async () => {
    if (!documentId) {
      setNotesMarkdown(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const fetchedMarkdown = await getDocumentNotesMarkdown(documentId);
      if (requestIdRef.current !== requestId) return;
      setNotesMarkdown(fetchedMarkdown);
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      const normalizedError = toError(err);
      setError(normalizedError);
      setNotesMarkdown(null);
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, [documentId]);

  useEffect(() => {
    loadNotesMarkdown();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadNotesMarkdown]);

  return {
    notesMarkdown,
    isLoading,
    error,
    refresh: loadNotesMarkdown,
  };
}
