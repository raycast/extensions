import fetch from "cross-fetch";
import { useRef } from "react";
import type { List } from "@raycast/api";
import { environment } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { SearchResponse, SearchResultItem, SearchResultSection } from "@/types/search";
import { prettyDate } from "@/utils/date";
import { favoriteAccessories } from "@/utils/item-accessories/favoriteAccessory";
import { buildLeagueLogoUrl, buildPlayerImageUrl, buildTeamLogoUrl } from "@/utils/url-builder";

export function useSearch(searchText: string) {
  const abortable = useRef<AbortController>();
  const { data, error, isLoading, revalidate } = useCachedPromise(
    async (query: string): Promise<SearchResultSection[]> => {
      const url = `https://apigw.fotmob.com/searchapi/suggest?term=${query}&lang=en`;
      const searchResponse = await fetch(url, {
        signal: abortable.current?.signal,
      });

      if (!searchResponse.ok) {
        throw new Error("Failed to fetch search results");
      }

      const searchResults: SearchResponse = await searchResponse.json();

      // Parse Team
      const teams = Promise.all(
        searchResults.teamSuggest?.[0]?.options.map(
          async (option): Promise<SearchResultItem> => ({
            type: "team",
            title: option.text.split("|")[0],
            iamgeUrl: buildTeamLogoUrl(option.payload.id),
            subtitle: ``,
            accessories: await favoriteAccessories("team", option.payload.id),
            payload: option.payload,
            raw: option,
          }),
        ) ?? [],
      );

      // Parse Player
      const players = Promise.all(
        searchResults.squadMemberSuggest?.[0]?.options.map(
          async (option): Promise<SearchResultItem> => ({
            type: "player",
            title: option.text.split("|")[0],
            iamgeUrl: buildPlayerImageUrl(option.payload.id),
            subtitle: ``,
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

      // Parse Match
      const matches = Promise.all(
        searchResults.matchSuggest?.[0]?.options.map(
          async (option): Promise<SearchResultItem> => ({
            type: "match",
            title: option.text.split("|")[0],
            iamgeUrl: buildLeagueLogoUrl(option.payload.leagueId, "dark"),
            subtitle: prettyDate(option.payload.matchDate),
            accessories: (
              [
                {
                  icon: buildTeamLogoUrl(option.payload.homeTeamId),
                },
                {
                  icon: buildTeamLogoUrl(option.payload.awayTeamId),
                },
              ] as List.Item.Accessory[]
            ).concat(
              typeof option.payload.homeScore === "number" && typeof option.payload.awayScore === "number"
                ? [
                    {
                      text: `${option.payload.homeScore} - ${option.payload.awayScore}`,
                    },
                  ]
                : [],
            ),
            payload: option.payload,
            raw: option,
          }),
        ) ?? [],
      );

      // Parse League
      const leagues = Promise.all(
        searchResults.leagueSuggest?.[0]?.options.map(
          async (option): Promise<SearchResultItem> => ({
            type: "league",
            title: option.text.split("|")[0],
            iamgeUrl: buildLeagueLogoUrl(option.payload.id, environment.appearance),
            subtitle: ``,
            accessories: [],
            payload: option.payload,
            raw: option,
          }),
        ) ?? [],
      );

      // Combine all results
      const cobinedResult = await Promise.all([teams, players, matches, leagues]);
      const results: SearchResultSection[] = [];

      if (cobinedResult[0].length > 0) {
        results.push({
          title: "Teams",
          items: cobinedResult[0] as SearchResultItem[],
        });
      }

      if (cobinedResult[1].length > 0) {
        results.push({
          title: "Players",
          items: cobinedResult[1] as SearchResultItem[],
        });
      }

      if (cobinedResult[2].length > 0) {
        results.push({
          title: "Matches",
          items: cobinedResult[2] as SearchResultItem[],
        });
      }

      if (cobinedResult[3].length > 0) {
        results.push({
          title: "Leagues",
          items: cobinedResult[3] as SearchResultItem[],
        });
      }

      return results;
    },
    [searchText],
    {
      abortable,
    },
  );

  return {
    result: data,
    error,
    isLoading,
    revalidate,
  };
}
