import { getCacheFilepath } from "@lib/cache";
import { ha } from "@lib/common";
import { getErrorMessage } from "@lib/utils";
import { unlink } from "fs/promises";
import { useEffect, useState } from "react";
import { getCameraRefreshInterval } from "./grid";

// Give Raycast some time to stop displaying the previous snapshot before it is deleted
const previousImageCleanupDelay = 15000;

async function removeFile(filepath: string) {
  try {
    await unlink(filepath);
  } catch {
    // ignore, the file might be gone already
  }
}

export function useImage(
  entityID: string,
  defaultIcon?: string,
): {
  error?: string;
  isLoading: boolean;
  imageFilepath?: string;
} {
  const [imageFilepath, setImageFilepath] = useState<string | undefined>(defaultIcon);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let didUnmount = false;
    let currentFilepath: string | undefined;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      // Track the attempted path outside the try so a failed download can be cleaned up.
      let newFilepath: string | undefined;
      try {
        // Use a unique filename per snapshot. Raycast caches images by path, so reusing the
        // same path would never show a newer image.
        newFilepath = await getCacheFilepath(`img_${entityID}_${Date.now()}.jpg`, true);
        await ha.getCameraProxyURL(entityID, newFilepath);
        if (didUnmount) {
          await removeFile(newFilepath);
          return;
        }
        const previousFilepath = currentFilepath;
        currentFilepath = newFilepath;
        setImageFilepath(newFilepath);
        if (previousFilepath) {
          setTimeout(() => removeFile(previousFilepath), previousImageCleanupDelay);
        }
        const interval = getCameraRefreshInterval();
        if (interval && interval > 0) {
          setTimeout(fetchData, interval);
        }
      } catch (error) {
        // Remove any partial output of the failed download, even after unmount. This never
        // touches currentFilepath, so the last successful snapshot stays visible.
        if (newFilepath && newFilepath !== currentFilepath) {
          await removeFile(newFilepath);
        }
        if (!didUnmount) {
          setError(getErrorMessage(error));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
      if (currentFilepath) {
        removeFile(currentFilepath);
      }
    };
  }, [entityID]);

  return { error, isLoading, imageFilepath };
}
