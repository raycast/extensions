import { getPreferenceValues } from "@raycast/api";
import { useState, useEffect } from "react";

interface SavedResolution {
  width: number;
  height: number;
}

interface Preferences {
  favWidth?: string;
  favHeight?: string;
}

export function useSavedFavResolution() {
  const [savedResolution, setSavedResolution] = useState<SavedResolution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState(true);

  // Load saved resolution on mount
  useEffect(() => {
    try {
      const preferences = getPreferenceValues<Preferences>();
      const width = preferences.favWidth
        ? (() => {
            const parsed = parseInt(preferences.favWidth, 10);
            return isNaN(parsed) ? null : parsed;
          })()
        : null;
      const height = preferences.favHeight
        ? (() => {
            const parsed = parseInt(preferences.favHeight, 10);
            return isNaN(parsed) ? null : parsed;
          })()
        : null;

      // Validate if input is a valid number
      const isWidthValid = !preferences.favWidth || !isNaN(Number(preferences.favWidth));
      const isHeightValid = !preferences.favHeight || !isNaN(Number(preferences.favHeight));

      if (isWidthValid && isHeightValid && width && height && width > 0 && height > 0) {
        setSavedResolution({ width, height });
        setIsValid(true);
      } else if (preferences.favWidth || preferences.favHeight) {
        // Only set to false when there are values but they are invalid
        setSavedResolution(null);
        setIsValid(false);
      } else {
        // No values provided
        setSavedResolution(null);
        setIsValid(true);
      }
    } catch (error) {
      console.error("Error loading saved resolution:", error);
      setSavedResolution(null);
      setIsValid(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    savedResolution,
    isLoading,
    isValid,
  };
}
