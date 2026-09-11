// useCategoryFeed.ts
// Hook to fetch stories and events for a selected category

import { useFetch } from "@raycast/utils";
import { useMemo, useState, useEffect } from "react";
import { HistoricalEvent } from "../interfaces";
import { getLatestBatch, storiesToArticles, StoryResponse } from "../utils";

export function useCategoryFeed(categoryId: string, language: string, providedBatchId?: string) {
  const isOnThisDay = categoryId === "onthisday";
  const isChaosIndex = categoryId === "chaos";
  const [batchId, setBatchId] = useState<string | null>(providedBatchId || null);
  const [isLoadingBatch, setIsLoadingBatch] = useState(!providedBatchId && !isChaosIndex);
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    if (providedBatchId || isChaosIndex) {
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
  }, [language, providedBatchId, isChaosIndex]);

  // Build the URL for content fetching - ONLY if categoryId is not empty
  const contentUrl = !categoryId
    ? ""
    : isChaosIndex
      ? providedBatchId
        ? `https://kite.kagi.com/api/batches/${encodeURIComponent(providedBatchId)}/chaos?lang=${encodeURIComponent(language)}`
        : `https://kite.kagi.com/api/batches/latest/chaos?lang=${encodeURIComponent(language)}`
      : isOnThisDay
        ? providedBatchId
          ? `https://kite.kagi.com/api/batches/${encodeURIComponent(providedBatchId)}/onthisday?lang=${encodeURIComponent(language)}`
          : `https://kite.kagi.com/api/batches/latest/onthisday?lang=${encodeURIComponent(language)}`
        : batchId
          ? `https://kite.kagi.com/api/batches/${encodeURIComponent(batchId)}/categories/${encodeURIComponent(
              categoryId,
            )}/stories?lang=${encodeURIComponent(language)}&limit=50`
          : "";

  // Fetch stories, events, or chaos index data
  const {
    isLoading: loadingContent,
    data: contentData,
    error: contentError,
  } = useFetch<{
    stories?: StoryResponse[];
    events?: HistoricalEvent[];
    score?: number;
    description?: string;
    timestamp?: number;
    chaosIndex?: number;
    chaosDescription?: string;
    chaosLastUpdated?: string;
  }>(contentUrl, {
    parseResponse: async (
      response,
    ): Promise<{
      stories?: StoryResponse[];
      events?: HistoricalEvent[];
      score?: number;
      description?: string;
      timestamp?: number;
      chaosIndex?: number;
      chaosDescription?: string;
      chaosLastUpdated?: string;
    }> => {
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.status}`);
      }
      return response.json() as Promise<{
        stories?: StoryResponse[];
        events?: HistoricalEvent[];
        score?: number;
        description?: string;
        timestamp?: number;
        chaosIndex?: number;
        chaosDescription?: string;
        chaosLastUpdated?: string;
      }>;
    },
    execute: contentUrl !== "",
  });

  // Transform data into articles, events, or chaos index
  const { articles, events, chaosIndex } = useMemo(() => {
    if (!contentData) {
      return { articles: [], events: [], chaosIndex: null };
    }

    if (isChaosIndex) {
      // Check if all three chaos fields are missing/falsy
      const hasValidChaosData = contentData.chaosIndex || contentData.chaosDescription || contentData.chaosLastUpdated;

      return {
        articles: [],
        events: [],
        chaosIndex: hasValidChaosData
          ? {
              score: contentData.chaosIndex || 0,
              description: contentData.chaosDescription || "",
              timestamp: contentData.chaosLastUpdated || "",
            }
          : null,
      };
    }

    if (isOnThisDay) {
      // Today in History response structure
      const allEvents = (contentData.events || []) as HistoricalEvent[];
      const eventsList = allEvents.filter((e) => e.type === "event").sort((a, b) => a.sort_year - b.sort_year);
      const peopleList = allEvents.filter((e) => e.type === "people").sort((a, b) => a.sort_year - b.sort_year);

      return {
        articles: [],
        events: [...eventsList, ...peopleList],
        chaosIndex: null,
      };
    } else {
      // Stories response structure
      const parsedArticles = storiesToArticles(contentData.stories || []);
      return {
        articles: parsedArticles,
        events: [],
        chaosIndex: null,
      };
    }
  }, [contentData, isOnThisDay, isChaosIndex]);

  return {
    articles,
    events,
    chaosIndex,
    isLoading: isLoadingBatch || loadingContent,
    error: batchError || (contentError instanceof Error ? contentError.message : null),
    isOnThisDay,
    isChaosIndex,
  };
}
