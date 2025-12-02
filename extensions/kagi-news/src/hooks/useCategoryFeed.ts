import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { Cluster, HistoricalEvent, OnThisDayResponse, CategoryResponse } from "../interfaces";
import { NEWS_BASE_URL, clustersToArticles } from "../utils";

export function useCategoryFeed(categoryFile: string, language: string) {
  const suffix = language === "default" ? "" : `_${language}`;
  const fileName = categoryFile.replace(".json", `${suffix}.json`);
  const url = `${NEWS_BASE_URL}/${fileName}`;

  const { isLoading, data, error } = useFetch<CategoryResponse | OnThisDayResponse>(url, {
    parseResponse: async (response): Promise<CategoryResponse | OnThisDayResponse> => {
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      return (await response.json()) as CategoryResponse | OnThisDayResponse;
    },
  });

  const isOnThisDay = categoryFile === "onthisday.json";

  const { articles, events } = useMemo(() => {
    if (!data) {
      return { articles: [], events: [] };
    }

    if (isOnThisDay) {
      const responseData = data as OnThisDayResponse;
      const allEvents = (responseData.events || []) as HistoricalEvent[];

      const eventsList = allEvents.filter((e) => e.type === "event").sort((a, b) => a.sort_year - b.sort_year);
      const peopleList = allEvents.filter((e) => e.type === "people").sort((a, b) => a.sort_year - b.sort_year);

      return {
        articles: [],
        events: [...eventsList, ...peopleList],
      };
    } else {
      const responseData = data as CategoryResponse;
      const parsedArticles = clustersToArticles((responseData.clusters || []) as Cluster[]);
      return {
        articles: parsedArticles,
        events: [],
      };
    }
  }, [data, isOnThisDay]);

  return {
    articles,
    events,
    isLoading,
    error: error ? (error as Error).message : null,
    isOnThisDay,
  };
}
