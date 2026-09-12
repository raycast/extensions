import { List, type LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState, useMemo, useCallback } from "react";
import { GameData, GamesListItem } from "./components/games-list";
import { useBatchGameThumbnails } from "./hooks/game-thumbnails";

type SearchResponse = {
  searchResults: Array<{
    contentGroupType: string;
    contents: Array<{
      universeId: number;
      name: string;
      description: string;
      playerCount: number;
      totalUpVotes: number;
      totalDownVotes: number;
      emphasis: boolean;
      isSponsored: boolean;
      nativeAdData: string;
      creatorName: string;
      creatorHasVerifiedBadge: boolean;
      creatorId: number;
      rootPlaceId: number;
      minimumAge: number;
      ageRecommendationDisplayName: string;
      contentType: string;
      contentId: number;
      defaultLayoutData: null;
    }>;
    topicId: string;
  }>;
};

export default (props: LaunchProps<{ arguments: Arguments.SearchGames }>) => {
  const { startingQuery } = props.arguments;

  const [searchText, setSearchText] = useState(startingQuery ?? "");
  const [debouncedSearchText, setDebouncedSearchText] = useState(searchText);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  const { data: searchResults, isLoading: searchResultsLoading } = useFetch<SearchResponse>(
    `https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(debouncedSearchText)}&pageToken=&sessionId=1&pageType=all`,
  );

  const games = useMemo(() => {
    if (searchResultsLoading || !searchResults) {
      return [];
    }

    const newGames: GameData[] = [];

    searchResults.searchResults.forEach((result) => {
      if (result.contentGroupType == "Game") {
        result.contents.forEach((content) => {
          if (content.isSponsored) {
            // Skip sponsored games
            return;
          }

          newGames.push({
            universeId: content.universeId,
            name: content.name,
            rootPlaceId: content.rootPlaceId,
            creatorName: content.creatorName,
            playerCount: content.playerCount,
            totalUpVotes: content.totalUpVotes,
            totalDownVotes: content.totalDownVotes,
          });
        });
      }
    });

    return newGames;
  }, [searchResults, searchResultsLoading]);

  const handleSearchTextChange = useCallback((newSearchText: string) => {
    setSearchText(newSearchText);
  }, []);

  const gameIds = useMemo(() => {
    return games.map((game) => game.universeId);
  }, [games]);
  const { data: thumbnails, isLoading: thumbnailsLoading } = useBatchGameThumbnails(gameIds);

  const isLoading = searchResultsLoading || thumbnailsLoading;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      navigationTitle="Search Games"
      searchBarPlaceholder="Search"
      filtering={false}
      isShowingDetail
    >
      {games.map((game) => {
        const gameThumbnails = thumbnails[game.universeId];
        return (
          <GamesListItem
            key={game.universeId}
            game={game}
            options={{
              thumbnails: gameThumbnails,
            }}
          />
        );
      })}
    </List>
  );
};
