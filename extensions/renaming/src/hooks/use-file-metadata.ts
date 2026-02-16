/**
 * Hook for fetching file metadata
 */

import { useState, useEffect } from "react";
import { getFileMetadata, type FileMetadata } from "../lib/metadata";
import { log } from "../lib/logger";

interface UseFileMetadataResult {
  metadata: FileMetadata | null;
  isLoading: boolean;
}

/**
 * Hook to fetch metadata for a file.
 * Fetches metadata on mount and whenever filePath changes.
 */
export function useFileMetadata(filePath: string | null): UseFileMetadataResult {
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!filePath) {
      setMetadata(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getFileMetadata(filePath)
      .then((result) => {
        if (!cancelled) {
          setMetadata(result);
        }
      })
      .catch((error) => {
        log.metadata.warn(`Failed to load metadata for "${filePath}"`, error);
        if (!cancelled) {
          setMetadata(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return { metadata, isLoading };
}
