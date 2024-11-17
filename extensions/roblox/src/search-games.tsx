import { Action, ActionPanel, List, type LaunchProps } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";
import { GamePage } from "./components/game-page";
import { numberWithCommas } from "./modules/utils";
import { generateGamePageLink } from "./modules/roblox-links";

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

type GameData = {
  universeId: number;
  name: string;
  rootPlaceId: number;
  creatorName: string;
  playerCount: number;
  totalUpVotes: number;
  totalDownVotes: number;
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

  const [games, setGames] = useState<GameData[]>([]);

  useEffect(() => {
    if (searchResultsLoading) {
      return;
    }

    const newGames: GameData[] = [];

    searchResults?.searchResults.forEach((result) => {
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

    setGames(newGames);
  }, [searchResults, searchResultsLoading]);

  return (
    <List
      isLoading={searchResultsLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      navigationTitle="Search Games"
      searchBarPlaceholder="Search"
      filtering={false}
      isShowingDetail
    >
      {games.map((game) => {
        const { universeId, name, rootPlaceId, creatorName, playerCount, totalUpVotes, totalDownVotes } = game;

        const gameURL = generateGamePageLink(rootPlaceId);

        return (
          <List.Item
            key={universeId}
            title={name}
            actions={
              <ActionPanel>
                <Action.Push title="View" target={<GamePage universeId={universeId} />} />
              </ActionPanel>
            }
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Link title="Universe ID" text={universeId.toString()} target={gameURL} />
                    <List.Item.Detail.Metadata.Label title="Name" text={name} />

                    {creatorName && <List.Item.Detail.Metadata.Label title="Creator" text={creatorName} />}

                    <List.Item.Detail.Metadata.Label
                      title="Playing"
                      text={`${numberWithCommas(playerCount)} players`}
                    />

                    <List.Item.Detail.Metadata.Label title="Likes" text={`${numberWithCommas(totalUpVotes)} likes`} />
                    <List.Item.Detail.Metadata.Label
                      title="Dislikes"
                      text={`${numberWithCommas(totalDownVotes)} dislikes`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
          />
        );
      })}
    </List>
  );
};
