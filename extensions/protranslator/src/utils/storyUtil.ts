import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import crypto from "crypto";

export type SavedStory = {
  id: string;
  topic: string;
  english_text: string;
  vietnamese_translation: string;
  words: { term: string; definition: string }[];
  createdAt: string;
};

const STORIES_KEY = "grammar-pro-stories";

async function loadStories(): Promise<SavedStory[]> {
  const raw = await LocalStorage.getItem<string>(STORIES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedStory[];
  } catch {
    return [];
  }
}

async function saveStories(stories: SavedStory[]): Promise<void> {
  await LocalStorage.setItem(STORIES_KEY, JSON.stringify(stories));
}

export function useStories() {
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStories().then((loaded) => {
      setStories(loaded);
      setIsLoading(false);
    });
  }, []);

  const addStory = useCallback(
    async (storyData: Omit<SavedStory, "id" | "createdAt">) => {
      setStories((prev) => {
        const newStory: SavedStory = {
          ...storyData,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        const updated = [newStory, ...prev];
        saveStories(updated);
        return updated;
      });
    },
    [],
  );

  const removeStory = useCallback(async (id: string) => {
    setStories((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveStories(updated);
      return updated;
    });
  }, []);

  return useMemo(
    () => ({ stories, isLoadingStories: isLoading, addStory, removeStory }),
    [stories, isLoading, addStory, removeStory],
  );
}
