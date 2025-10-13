import { useState, useEffect, useCallback } from "react";
import { Folder } from "./types";
import { getFoldersWithCache } from "./folderHelpers";

interface UseFoldersReturn {
  folders: Folder[];
  isLoading: boolean;
  refreshFolders: () => void;
}

/**
 * Custom hook for managing folder data with cache-first approach
 */
export function useFolders(): UseFoldersReturn {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadFolders = useCallback(async () => {
    try {
      setIsLoading(true);
      const foldersList = await getFoldersWithCache({ includeDocumentIds: true });
      setFolders(foldersList);
    } catch (error) {
      setFolders([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshFolders = useCallback(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  return {
    folders,
    isLoading,
    refreshFolders,
  };
}
