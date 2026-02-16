/**
 * Hook for loading file thumbnails
 *
 * Always attempts thumbnail generation via qlmanage.
 * Support is derived from the result, not pre-checked.
 */

import { useState, useEffect } from "react";
import { getThumbnail } from "../lib/thumbnails";
import { log } from "../lib/logger";

interface UseThumbnailResult {
  thumbnailPath: string | null;
  isLoading: boolean;
}

/**
 * Hook to fetch thumbnail for a file.
 * Returns the path to the thumbnail image if Quick Look can generate one.
 */
export function useThumbnail(filePath: string | null): UseThumbnailResult {
  const [thumbnailPath, setThumbnailPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!filePath) {
      setThumbnailPath(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    getThumbnail(filePath)
      .then((path) => {
        if (!cancelled) {
          setThumbnailPath(path);
        }
      })
      .catch((error) => {
        log.thumbnails.warn(`Failed to generate thumbnail for "${filePath}"`, error);
        if (!cancelled) {
          setThumbnailPath(null);
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

  return { thumbnailPath, isLoading };
}
