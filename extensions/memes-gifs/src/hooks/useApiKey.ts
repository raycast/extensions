import { useState, useEffect } from "react";
import { getPreferenceValues, LocalStorage } from "@raycast/api";

export function useApiKey() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoadingApiKey, setIsLoadingApiKey] = useState(true);

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        // First try to get from preferences
        const preferences = getPreferenceValues<{ tenorApiKey?: string }>();
        if (preferences.tenorApiKey) {
          setApiKey(preferences.tenorApiKey);
          setIsLoadingApiKey(false);
          return;
        }

        // If not in preferences, try LocalStorage
        const storedApiKey = await LocalStorage.getItem<string>("tenorApiKey");
        if (storedApiKey) {
          setApiKey(storedApiKey);
        }
      } catch (error) {
        console.error("Failed to load API key:", error);
      } finally {
        setIsLoadingApiKey(false);
      }
    };

    loadApiKey();
  }, []);

  const handleApiKeySaved = (newApiKey: string) => {
    setApiKey(newApiKey);
  };

  return {
    apiKey,
    isLoadingApiKey,
    handleApiKeySaved,
  };
}
