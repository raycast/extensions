import { useState, useEffect, useCallback } from "react";
import type { CapturedData } from "../utils";
import { utils } from "../utils";

interface CaptureFile {
  path: string;
  data: CapturedData;
  timestamp: Date;
}

export function useCaptureList(directory: string) {
  const [items, setItems] = useState<CaptureFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const captures = await utils.loadCaptures(directory);
      setItems(captures);
    } catch (error) {
      console.error("Failed to load captures:", error);
    } finally {
      setIsLoading(false);
    }
  }, [directory]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, isLoading, refresh };
}
