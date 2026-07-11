import { useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import type { SearchResultItem } from "@/types/search";
import { useFavorite } from "@/hooks/useFavorite";
import { useTeamSearch } from "@/hooks/useTeamSearch";
import { launchTeamCommand } from "@/utils/launcher/launchTeamDetailCommand";
import { buildTeamDetailUrl } from "@/utils/url-builder";

export default function TeamSearchView() {
  const [searchText, setSearchText] = useState("");
  const favoriteService = useFavorite();
  const { teams, isLoading, error } = useTeamSearch(searchText);

  const isFavorite = (teamId: string) => {
    const favoritedTeams = favoriteService.teams;
    return favoritedTeams.some((team) => team.id === teamId);
  };

  const handleAddToFavorites = async (team: SearchResultItem) => {
    if (team.type === "team") {
      await favoriteService.addItems({
        type: "team",
        value: {
          id: team.payload.id,
          leagueId: `${team.payload.leagueId}`,
          name: team.title,
        },
      });
    }
    showToast({
      style: Toast.Style.Success,
      title: "Added to Favorites",
      message: `${team.title} has been added to your favorites`,
    });
  };

  const handleRemoveFromFavorites = async (teamId: string, teamName: string) => {
    await favoriteService.removeItems("team", teamId);
    showToast({
      style: Toast.Style.Success,
      title: "Removed from Favorites",
      message: `${teamName} has been removed from your favorites`,
    });
  };

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Search Error"
          description="Failed to search for teams. Please try again."
        />
      </List>
    );
  }

  return (
    <List
      searchBarPlaceholder="Search for football teams by name..."
      filtering={false}
      navigationTitle="Search Teams"
      onSearchTextChange={setSearchText}
      throttle={true}
      isLoading={isLoading}
    >
      {searchText.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search for Teams"
          description="Start typing to search for football teams by name"
        />
      ) : teams.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No Teams Found"
          description={`No teams found matching "${searchText}". Try a different search term.`}
        />
      ) : (
        teams.map((team) => (
          <List.Item
            key={`${team.payload.id}_${team.title}`}
            icon={team.imageUrl}
            title={team.title}
            subtitle={team.subtitle}
            accessories={team.accessories}
            actions={
              <ActionPanel>
                <Action
                  icon={Icon.AppWindowSidebarRight}
                  title="Show Team Details"
                  onAction={() => {
                    launchTeamCommand(team.payload.id);
                  }}
                />
                <Action.OpenInBrowser
                  title="Open in Browser"
                  icon={Icon.Globe}
                  url={buildTeamDetailUrl(team.payload.id)}
                />
                <Action
                  icon={isFavorite(team.payload.id) ? Icon.StarDisabled : Icon.Star}
                  title={isFavorite(team.payload.id) ? "Remove from Favorites" : "Add to Favorites"}
                  onAction={async () => {
                    if (isFavorite(team.payload.id)) {
                      await handleRemoveFromFavorites(team.payload.id, team.title);
                    } else {
                      await handleAddToFavorites(team);
                    }
                  }}
                />
                <Action.CopyToClipboard
                  title="Copy Team ID"
                  content={team.payload.id}
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
