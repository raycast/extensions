import { useEffect, useState } from "react";
import { Pixabay } from "./api";
import { getCacheFilepath } from "./cache";
import { fileToBase64Image, getErrorMessage, sha256FromString } from "./utils";

export function useImage(
  url: string,
  id: string,
  defaultIcon?: string
): {
  localFilepath?: string;
  error?: string;
  isLoading: boolean;
} {
  const [localFilepath, setLocalFilepath] = useState<string | undefined>(defaultIcon);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const urlHash = sha256FromString(url);
        const localFilepath = await getCacheFilepath(`img_${id}.png`, true);
        await Pixabay.downloadFile(url, { localFilepath: localFilepath });
        const base64 = await fileToBase64Image(localFilepath);
        if (!didUnmount) {
          setLocalFilepath(base64);
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
  }, [url]);

  return { localFilepath, error, isLoading };
}
