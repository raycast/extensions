import { useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import type { SearchResponse, SearchResultItem } from "@/types/search";
import { favoriteAccessories } from "@/utils/item-accessories/favoriteAccessory";
import { buildPlayerImageUrl } from "@/utils/url-builder";

export function usePlayerSearch(searchText: string) {
  const abortable = useRef<AbortController | undefined>(undefined);
  const { data, error, isLoading, revalidate } = useCachedPromise(
    async (query: string): Promise<SearchResultItem[]> => {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const url = `https://apigw.fotmob.com/searchapi/suggest?term=${encodeURIComponent(query)}&lang=en`;

      try {
        const searchResponse = await fetch(url, {
          signal: abortable.current?.signal,
        });

        if (!searchResponse.ok) {
          console.warn(`Search API returned ${searchResponse.status} for query: ${query}`);
          return [];
        }

        const searchResults: SearchResponse = (await searchResponse.json()) as SearchResponse;

        // Parse Players only
        const players = await Promise.all(
          searchResults.squadMemberSuggest?.[0]?.options.map(
            async (option): Promise<SearchResultItem> => ({
              type: "player",
              title: option.text.split("|")[0],
              imageUrl: buildPlayerImageUrl(option.payload.id),
              subtitle: option.payload.teamName
                ? `${option.payload.teamName} • Player ID: ${option.payload.id}`
                : `Player ID: ${option.payload.id}`,
              accessories: (await favoriteAccessories("player", option.payload.id)).concat(
                typeof option.payload.teamId === "number" && option.payload.teamName
                  ? [{ tag: option.payload.teamName }]
                  : [],
              ),
              payload: option.payload,
              raw: option,
            }),
          ) ?? [],
        );

        return players;
      } catch {
        // Return empty array instead of throwing to allow graceful fallback
        // This prevents search failures from breaking the UI
        return [];
      }
    },
    [searchText],
    {
      abortable,
    },
  );

  return {
    players: data ?? [],
    error,
    isLoading,
    revalidate,
  };
}
