/**
 * Hook for managing custom/generated ASCII arts
 */
import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CustomArt,
  getStoredCustomArts,
  addCustomArt as addCustomArtStorage,
  removeCustomArt as removeCustomArtStorage,
  customArtsToKaomoji,
} from "../lib/storage";
import type { Kaomoji } from "../types";

interface UseCustomArtsResult {
  customArts: CustomArt[];
  customArtsAsKaomoji: Kaomoji[];
  isLoading: boolean;
  addCustomArt: (art: CustomArt) => Promise<void>;
  removeCustomArt: (text: string) => Promise<void>;
  isCustomArt: (text: string) => boolean;
}

export function useCustomArts(): UseCustomArtsResult {
  const [customArts, setCustomArts] = useState<CustomArt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const loadCustomArts = async () => {
      try {
        const stored = await getStoredCustomArts();
        if (isMountedRef.current) {
          setCustomArts(stored);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[useCustomArts] Failed to load custom arts:", error);
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadCustomArts();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const addCustomArt = useCallback(
    async (art: CustomArt) => {
      // Check if already exists
      if (customArts.some((a) => a.text === art.text)) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Already saved",
        });
        return;
      }

      // Optimistic update
      const newCustomArts = [art, ...customArts];
      setCustomArts(newCustomArts);

      try {
        await addCustomArtStorage(art);
        await showToast({
          style: Toast.Style.Success,
          title: "Saved to collection",
        });
      } catch (error) {
        console.error("[useCustomArts] Failed to save custom art:", error);
        // Revert on error
        if (isMountedRef.current) {
          setCustomArts(customArts);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to save",
          });
        }
      }
    },
    [customArts],
  );

  const removeCustomArt = useCallback(
    async (text: string) => {
      // Optimistic update
      const newCustomArts = customArts.filter((a) => a.text !== text);
      setCustomArts(newCustomArts);

      try {
        await removeCustomArtStorage(text);
        await showToast({
          style: Toast.Style.Success,
          title: "Removed from collection",
        });
      } catch (error) {
        console.error("[useCustomArts] Failed to remove custom art:", error);
        // Revert on error
        if (isMountedRef.current) {
          setCustomArts(customArts);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to remove",
          });
        }
      }
    },
    [customArts],
  );

  const isCustomArt = useCallback((text: string) => customArts.some((a) => a.text === text), [customArts]);

  const customArtsAsKaomoji = customArtsToKaomoji(customArts);

  return {
    customArts,
    customArtsAsKaomoji,
    isLoading,
    addCustomArt,
    removeCustomArt,
    isCustomArt,
  };
}
