import { useEffect, useState } from "react";

import { Pixabay } from "@/lib/api";
import { getCacheFilepath } from "@/lib/cache";
import { fileToBase64Image, getErrorMessage } from "@/lib/utils";

export function useImage(
  url: string,
  id: string,
  defaultIcon?: string,
): {
  base64?: string;
  localFilepath?: string;
  error?: string;
  isLoading: boolean;
} {
  const [localFilepath, setLocalFilepath] = useState<string | undefined>(defaultIcon);
  const [base64, setBase64] = useState<string | undefined>();
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
        const localFilepath = await getCacheFilepath(`img_${id}.png`, true);
        await Pixabay.downloadFile(url, { localFilepath: localFilepath });
        const base64 = await fileToBase64Image(localFilepath);
        if (!didUnmount) {
          setBase64(base64);
          setLocalFilepath(localFilepath);
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

  return { localFilepath, error, isLoading, base64 };
}
