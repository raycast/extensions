import { useRef } from "react";
import { useCachedPromise } from "@raycast/utils";
import type { SearchResponse, SearchResultItem } from "@/types/search";
import { favoriteAccessories } from "@/utils/item-accessories/favoriteAccessory";
import { buildTeamLogoUrl } from "@/utils/url-builder";

export function useTeamSearch(searchText: string) {
  const abortable = useRef<AbortController | undefined>(undefined);
  const { data, error, isLoading, revalidate } = useCachedPromise(
    async (query: string): Promise<SearchResultItem[]> => {
      const url = `https://apigw.fotmob.com/searchapi/suggest?term=${query}&lang=en`;
      const searchResponse = await fetch(url, {
        signal: abortable.current?.signal,
      });

      if (!searchResponse.ok) {
        throw new Error("Failed to fetch search results");
      }

      const searchResults: SearchResponse = (await searchResponse.json()) as SearchResponse;

      // Parse Teams only
      const teams = await Promise.all(
        searchResults.teamSuggest?.[0]?.options.map(
          async (option): Promise<SearchResultItem> => ({
            type: "team",
            title: option.text.split("|")[0],
            imageUrl: buildTeamLogoUrl(option.payload.id),
            subtitle: `Team ID: ${option.payload.id}`,
            accessories: await favoriteAccessories("team", option.payload.id),
            payload: option.payload,
            raw: option,
          }),
        ) ?? [],
      );

      return teams;
    },
    [searchText],
    {
      abortable,
    },
  );

  return {
    teams: data ?? [],
    error,
    isLoading,
    revalidate,
  };
}
