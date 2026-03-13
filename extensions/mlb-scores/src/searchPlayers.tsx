import { Action, ActionPanel, Icon, Image, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import PlayerSearchResponse, { Hit } from "./interfaces/playerSearch";
import PlayerDetail from "./components/playerDetail";

export default function SearchPlayers() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<PlayerSearchResponse | null>(null);

  async function searchPlayers(query: string) {
    if (!query || query.length < 2) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("https://yvo49oxzy7-dsn.algolia.net/1/indexes/*/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-algolia-agent": "Algolia for JavaScript (4.8.2); Browser (lite)",
          "x-algolia-api-key": "2305f7af47eda36d30e1fa05f9986e56",
          "x-algolia-application-id": "YVO49OXZY7",
        },
        body: JSON.stringify({
          requests: [
            {
              indexName: "mlb-players",
              params: `highlightPreTag=%3Cais-highlight-0000000000%3E&highlightPostTag=%3C%2Fais-highlight-0000000000%3E&filters=culture%3Aen-us&query=${encodeURIComponent(
                query
              )}&facets=%5B%5D&tagFilters=`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }

      const data = (await response.json()) as PlayerSearchResponse;

      // Sort the hits by lastUpdatedDate in descending order (most recent first)
      if (data.results[0]?.hits) {
        data.results[0].hits.sort((a, b) => b.lastUpdatedDate - a.lastUpdatedDate);
      }

      setSearchResults(data);
    } catch (error) {
      console.error("Error fetching player data:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to search players",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Get player headshot URL
  function getPlayerHeadshot(playerId: number, size = 200) {
    return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:83:current.png,w_${size},q_auto:best/v1/people/${playerId}/headshot/83/current`;
  }

  // Debounce search
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    searchPlayers(text);
  };

  // Extract player position if available
  const getPlayerPosition = (player: any) => {
    return player.position ? `(${player.position})` : "";
  };

  // Get player team if available
  const getPlayerTeam = (player: any) => {
    return player.teamName && player.teamName.length > 0 ? player.teamName[0] : "";
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Search MLB players..."
      throttle
    >
      {searchResults?.results[0]?.hits.map((player, index) => (
        <List.Item
          key={`${player.objectID}-${index}`}
          title={player.title}
          subtitle={getPlayerPosition(player)}
          accessories={[
            {
              icon: player.lastUpdatedDate ? Icon.Clock : undefined,
              tooltip: player.lastUpdatedDate
                ? `Last updated: ${new Date(player.lastUpdatedDate).toLocaleDateString()}`
                : undefined,
              text: player.lastUpdatedDate ? new Date(player.lastUpdatedDate).toLocaleDateString() : "",
            },
          ]}
          icon={{
            source: player.playerId ? getPlayerHeadshot(player.playerId) : Icon.Person,
            mask: Image.Mask.Circle,
          }}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Player Details"
                target={
                  <PlayerDetail
                    playerId={player.playerId}
                    biography={player.biography}
                    highlights={player.highlight}
                    prospectBio={player.prospectBio}
                  />
                }
                icon={Icon.Person}
              />
              <Action.OpenInBrowser title="View Player Profile" url={player.url} />
              <Action.CopyToClipboard
                title="Copy Player ID"
                content={player.playerId.toString()}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <Action.CopyToClipboard
                title="Copy Player URL"
                content={player.url}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            </ActionPanel>
          }
        />
      ))}
      {searchText.length > 0 && searchResults?.results[0]?.hits.length === 0 && (
        <List.EmptyView title="No players found" description="Try a different search term" />
      )}
    </List>
  );
}
