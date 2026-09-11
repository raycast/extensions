import { useState, useEffect } from "react";
import { STORAGE_KEYS } from "../utils/constants";
import { getStoredData } from "../utils/storage";

interface BackgroundRefreshStatus {
  enabled: boolean;
  lastBackgroundRun?: string;
}

export function useBackgroundRefreshStatus() {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await getStoredData<BackgroundRefreshStatus>(STORAGE_KEYS.BACKGROUND_REFRESH_STATUS, {
          enabled: false,
        });
        setIsEnabled(status.enabled);
      } catch (error) {
        console.error("Error checking background refresh status:", error);
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkStatus();
  }, []);

  return { isEnabled, isLoading };
}
