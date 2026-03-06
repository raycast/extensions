// Hook to fetch stories and events for a selected category

import { useFetch } from "@raycast/utils";
import { useMemo, useState, useEffect } from "react";
import { HistoricalEvent } from "../interfaces";
import { getLatestBatch, storiesToArticles, StoryResponse } from "../utils";

export function useCategoryFeed(categoryId: string, language: string, providedBatchId?: string) {
  const isOnThisDay = categoryId === "onthisday";
  const [batchId, setBatchId] = useState<string | null>(providedBatchId || null);
  const [isLoadingBatch, setIsLoadingBatch] = useState(!providedBatchId);
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    if (providedBatchId) {
      return;
    }

    const fetchBatch = async () => {
      try {
        setIsLoadingBatch(true);
        const batch = await getLatestBatch(language);
        setBatchId(batch.id);
        setBatchError(null);
      } catch (err) {
        setBatchError(err instanceof Error ? err.message : "Failed to load batch");
        setBatchId(null);
      } finally {
        setIsLoadingBatch(false);
      }
    };

    fetchBatch();
  }, [language, providedBatchId]);

  // Build the URL for content fetching - ONLY if categoryId is not empty
  const contentUrl = !categoryId
    ? "" // Don't fetch if no category selected
    : isOnThisDay
      ? `https://kite.kagi.com/api/batches/latest/onthisday?lang=${encodeURIComponent(language)}`
      : batchId
        ? `https://kite.kagi.com/api/batches/${encodeURIComponent(batchId)}/categories/${encodeURIComponent(
            categoryId,
          )}/stories?lang=${encodeURIComponent(language)}&limit=50`
        : "";

  // Fetch stories or Today in History data
  const {
    isLoading: loadingContent,
    data: contentData,
    error: contentError,
  } = useFetch<{ stories?: StoryResponse[]; events?: HistoricalEvent[] }>(contentUrl, {
    parseResponse: async (response): Promise<{ stories?: StoryResponse[]; events?: HistoricalEvent[] }> => {
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }
      return response.json() as Promise<{ stories?: StoryResponse[]; events?: HistoricalEvent[] }>;
    },
    execute: contentUrl !== "",
  });

  // Transform data into articles and events
  const { articles, events } = useMemo(() => {
    if (!contentData) {
      return { articles: [], events: [] };
    }

    if (isOnThisDay) {
      // Today in History response structure
      const allEvents = (contentData.events || []) as HistoricalEvent[];
      const eventsList = allEvents.filter((e) => e.type === "event").sort((a, b) => a.sort_year - b.sort_year);
      const peopleList = allEvents.filter((e) => e.type === "people").sort((a, b) => a.sort_year - b.sort_year);

      return {
        articles: [],
        events: [...eventsList, ...peopleList],
      };
    } else {
      // Stories response structure
      const parsedArticles = storiesToArticles(contentData.stories || []);
      return {
        articles: parsedArticles,
        events: [],
      };
    }
  }, [contentData, isOnThisDay]);

  return {
    articles,
    events,
    isLoading: isLoadingBatch || loadingContent,
    error: batchError || (contentError instanceof Error ? contentError.message : null),
    isOnThisDay,
  };
}
