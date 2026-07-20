import { useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import type { SearchResultItem } from "@/types/search";
import { useFavorite } from "@/hooks/useFavorite";
import { usePlayerSearch } from "@/hooks/usePlayerSearch";
import { launchPlayerCommand } from "@/utils/launcher/launchPlayerDetailCommand";
import { buildPlayerDetailUrl } from "@/utils/url-builder";

export default function PlayerSearchView() {
  const [searchText, setSearchText] = useState("");
  const favoriteService = useFavorite();
  const { players, isLoading, error } = usePlayerSearch(searchText);

  const isFavorite = (playerId: string) => {
    const favoritedPlayers = favoriteService.players;
    return favoritedPlayers.some((player) => player.id === playerId);
  };

  const handleAddToFavorites = async (player: SearchResultItem) => {
    if (player.type === "player") {
      await favoriteService.addItems({
        type: "player",
        value: {
          id: player.payload.id,
          isCoach: player.payload.isCoach || false,
          name: player.title,
        },
      });
    }
    showToast({
      style: Toast.Style.Success,
      title: "Added to Favorites",
      message: `${player.title} has been added to your favorites`,
    });
  };

  const handleRemoveFromFavorites = async (playerId: string, playerName: string) => {
    await favoriteService.removeItems("player", playerId);
    showToast({
      style: Toast.Style.Success,
      title: "Removed from Favorites",
      message: `${playerName} has been removed from your favorites`,
    });
  };

  const handleViewPlayerDetails = (playerId: string) => {
    launchPlayerCommand(playerId);
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search Error"
          description="Failed to search for players. Please try again."
        />
      </List>
    );
  }

  return (
    <List
      searchBarPlaceholder="Search for football players by name..."
      filtering={false}
      navigationTitle="Search Players"
      onSearchTextChange={setSearchText}
      throttle={true}
      isLoading={isLoading}
    >
      {searchText.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search for Players"
          description="Start typing to search for football players by name"
        />
      ) : players.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No Players Found"
          description={`No players found matching "${searchText}". Try a different search term.`}
        />
      ) : (
        players.map((player) => (
          <List.Item
            key={`${player.payload.id}_${player.title}`}
            icon={player.imageUrl}
            title={player.title}
            subtitle={player.subtitle}
            accessories={player.accessories}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.Person}
                  title="Show Player Details"
                  onAction={() => {
                    handleViewPlayerDetails(player.payload.id);
                  }}
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  icon={Icon.Globe}
                  url={buildPlayerDetailUrl(player.payload.id)}
                />
                <Action
                  icon={isFavorite(player.payload.id) ? Icon.StarDisabled : Icon.Star}
                  title={isFavorite(player.payload.id) ? "Remove from Favorites" : "Add to Favorites"}
                  onAction={async () => {
                    if (isFavorite(player.payload.id)) {
                      await handleRemoveFromFavorites(player.payload.id, player.title);
                    } else {
                      await handleAddToFavorites(player);
                    }
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Player ID"
                  content={player.payload.id}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
