import { useState, useEffect, useCallback, useRef } from "react";
import { Folder } from "./types";
import { getFoldersFromAPI } from "./folderHelpers";

interface UseFoldersOptions {
  includeDocumentIds?: boolean;
}

interface UseFoldersReturn {
  folders: Folder[];
  isLoading: boolean;
  refreshFolders: () => void;
}

/**
 * Custom hook for managing folder data from API
 * Uses get-document-lists-metadata endpoint
 * Folder counts are computed from document_ids array length
 * @param options - Options for loading folders
 * @param options.includeDocumentIds - Whether to include document_ids (default: false for memory optimization)
 */
export function useFolders(options: UseFoldersOptions = {}): UseFoldersReturn {
  const { includeDocumentIds = false } = options;
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadFolders = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    try {
      setIsLoading(true);
      // By default, load folders without document_ids to save memory
      // Set includeDocumentIds: true if you need IDs for filtering/counting
      const foldersList = await getFoldersFromAPI({ includeDocumentIds, signal });

      if (!signal.aborted) {
        setFolders(foldersList);
      }
    } catch (error) {
      if (!signal.aborted) {
        setFolders([]);
      }
    } finally {
      if (!signal.aborted) {
        setIsLoading(false);
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [includeDocumentIds]);

  const refreshFolders = useCallback(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadFolders();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [loadFolders]);

  return {
    folders,
    isLoading,
    refreshFolders,
  };
}
