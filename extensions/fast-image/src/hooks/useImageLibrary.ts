import { existsSync } from "fs";
import { useCallback, useEffect, useState } from "react";
import { getAutoRefreshInterval, getImagesFolder } from "../preferences";
import { isAutoRefreshDue, markRefreshedNow } from "../lib/lastRefresh";
import { clearScanCache, readScanCache, writeScanCache } from "../lib/scanCache";
import { scanImagesFolder } from "../lib/scanner";
import { ImageFile } from "../types";

export type FolderStatus = "missing" | "not-found" | "ready";

export function useImageLibrary() {
  const folder = getImagesFolder();
  const autoRefreshInterval = getAutoRefreshInterval();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<FolderStatus>("ready");

  const load = useCallback(
    async (forceRescan: boolean) => {
      if (!folder) {
        setStatus("missing");
        setImages([]);
        setIsLoading(false);
        return;
      }

      if (!existsSync(folder)) {
        setStatus("not-found");
        setImages([]);
        setIsLoading(false);
        return;
      }

      setStatus("ready");

      if (!forceRescan) {
        const cached = readScanCache(folder);
        if (cached) {
          setImages(cached);
          setIsLoading(false);
          return;
        }
      } else {
        clearScanCache();
      }

      setIsLoading(true);
      const scanned = await scanImagesFolder(folder);
      writeScanCache(folder, scanned);
      await markRefreshedNow();
      setImages(scanned);
      setIsLoading(false);
    },
    [folder],
  );

  useEffect(() => {
    (async () => {
      const forceRescan = await isAutoRefreshDue(autoRefreshInterval);
      load(forceRescan);
    })();
  }, [load, autoRefreshInterval]);

  const refresh = useCallback(() => load(true), [load]);

  return { images, isLoading, status, folder, refresh };
}
