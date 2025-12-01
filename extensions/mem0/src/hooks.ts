import { useState, useEffect } from "react";
import { Clipboard, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getMemories, searchMemories } from "./utils";
import { Preferences } from "./types";

/**
 * Hook to read clipboard text
 */
export function useClipboardText() {
  const [clipboardText, setClipboardText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function getClipboardContent() {
      try {
        const text = await Clipboard.readText();
        if (text) {
          setClipboardText(text);
        } else {
          setClipboardText("Clipboard is empty");
        }
      } catch (error) {
        void error;
        setClipboardText("Failed to read clipboard");
      } finally {
        setIsLoading(false);
      }
    }
    getClipboardContent();
  }, []);

  return { clipboardText, isLoading };
}

/**
 * Hook to fetch all memories for a user using mem0 SDK
 */
export function useGetMemories(options?: { page?: number; pageSize?: number }) {
  const { mem0ApiKey, defaultUserId } = getPreferenceValues<Preferences>();
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 50;

  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    async (apiKey: string, userId: string, p: number, ps: number) => {
      return await getMemories(apiKey, userId, p, ps);
    },
    [mem0ApiKey, defaultUserId, page, pageSize],
    {
      keepPreviousData: true,
    },
  );

  return {
    memories: data?.results || [],
    isLoading,
    error,
    revalidate,
    mutate,
  };
}

/**
 * Hook to search memories using mem0 SDK
 */
export function useSearchMemories(query: string, options?: { execute?: boolean }) {
  const { mem0ApiKey, defaultUserId } = getPreferenceValues<Preferences>();
  const execute = options?.execute ?? true;

  const { data, isLoading, error, revalidate, mutate } = useCachedPromise(
    async (apiKey: string, q: string, userId: string) => {
      return await searchMemories(apiKey, q, userId);
    },
    [mem0ApiKey, query, defaultUserId],
    {
      execute: execute && query.length > 0,
      keepPreviousData: true,
    },
  );

  return {
    results: data?.results || [],
    isLoading,
    error,
    revalidate,
    mutate,
  };
}
