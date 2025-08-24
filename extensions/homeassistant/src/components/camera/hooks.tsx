import { getCacheFilepath } from "@lib/cache";
import { ha } from "@lib/common";
import { getErrorMessage } from "@lib/utils";
import { useEffect, useState } from "react";
import { getCameraRefreshInterval } from "./grid";
import { fileToBase64Image } from "./utils";

export function useImage(
  entityID: string,
  defaultIcon?: string,
): {
  localFilepath?: string;
  error?: string;
  isLoading: boolean;
  imageFilepath?: string;
} {
  const [localFilepath, setLocalFilepath] = useState<string | undefined>(defaultIcon);
  const [imageFilepath, setImageFilepath] = useState<string | undefined>(defaultIcon);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const localFilepath = await getCacheFilepath(`img_${entityID}.png`, true);
        await ha.getCameraProxyURL(entityID, localFilepath);
        const base64Img = await fileToBase64Image(localFilepath);
        if (!didUnmount) {
          const interval = getCameraRefreshInterval();
          if (interval && interval > 0) {
            setTimeout(fetchData, interval);
          }
          setLocalFilepath(base64Img);
          setImageFilepath(localFilepath);
        }
      } catch (error) {
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
    };
  }, [entityID]);

  return { localFilepath, error, isLoading, imageFilepath };
}
