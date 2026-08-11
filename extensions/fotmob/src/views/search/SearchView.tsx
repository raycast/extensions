import { Fragment, useState } from "react";
import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useFavorite } from "@/hooks/useFavorite";
import { useSearch } from "@/hooks/useSearch";
import { launchPlayerCommand } from "@/utils/launcher/launchPlayerDetailCommand";
import { launchTeamCommand } from "@/utils/launcher/launchTeamDetailCommand";
import {
  buildLeagueDetailUrl,
  buildMatchDetailUrl,
  buildPlayerDetailUrl,
  buildTeamDetailUrl,
} from "@/utils/url-builder";
import FavoriteView from "@/views/favorite/FavoriteView";

export default function SearchView() {
  const [searchText, setSearchText] = useState("");
  const favoriteService = useFavorite();

  const searchState = useSearch(searchText);

  const isFavorite = (teamId: string) => {
    const favoritedTeams = favoriteService.teams;
    return favoritedTeams.some((team) => team.id === teamId);
  };

  const isPlayerFavorite = (playerId: string) => {
    const favoritedPlayers = favoriteService.players;
    return favoritedPlayers.some((player) => player.id === playerId);
  };

  return (
    <List
      searchBarPlaceholder="Search for Clubs, Leagues, and Players"
      filtering={false}
      navigationTitle="Search"
      onSearchTextChange={setSearchText}
      throttle={true}
      isLoading={searchState.isLoading}
    >
      {((searchState.result ?? []).length > 0 &&
        searchState.result?.map((section) => {
          return (
            <List.Section title={section.title} key={section.title}>
              {section.items.map((item) => (
                <List.Item
                  key={`${item.payload.id}_${item.title}`}
                  icon={item.imageUrl}
                  title={item.title}
                  subtitle={item.subtitle}
                  accessories={item.accessories}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser
                        title="Open in Browser"
                        icon={Icon.Globe}
                        url={
                          item.type === "team"
                            ? buildTeamDetailUrl(item.payload.id)
                            : item.type === "player"
                              ? buildPlayerDetailUrl(item.payload.id)
                              : item.type === "league"
                                ? buildLeagueDetailUrl(item.payload.id)
                                : buildMatchDetailUrl(item.payload.id)
                        }
                      />
                      {item.type === "team" && (
                        <Fragment>
                          <Action
                            icon={Icon.AppWindowSidebarRight}
                            title="Show Details"
                            onAction={() => {
                              launchTeamCommand(item.payload.id);
                            }}
                          />
                          <Action
                            icon={isFavorite(item.payload.id) ? Icon.StarDisabled : Icon.Star}
                            title={isFavorite(item.payload.id) ? "Remove from Favorites" : "Add to Favorites"}
                            onAction={async () => {
                              if (isFavorite(item.payload.id)) {
                                await favoriteService.removeItems("team", item.payload.id);
                                showToast({
                                  style: Toast.Style.Success,
                                  title: "Removed from Favorites",
                                });
                                return;
                              }
                              await favoriteService.addItems({
                                type: "team",
                                value: {
                                  id: item.payload.id,
                                  leagueId: `${item.payload.leagueId}`,
                                  name: item.title,
                                },
                              });
                              showToast({
                                style: Toast.Style.Success,
                                title: "Added to Favorites",
                              });
                            }}
                          />
                        </Fragment>
                      )}
                      {item.type === "player" && (
                        <Fragment>
                          <Action
                            icon={Icon.Person}
                            title="Show Player Details"
                            onAction={() => {
                              launchPlayerCommand(item.payload.id);
                            }}
                          />
                          <Action
                            icon={isPlayerFavorite(item.payload.id) ? Icon.StarDisabled : Icon.Star}
                            title={isPlayerFavorite(item.payload.id) ? "Remove from Favorites" : "Add to Favorites"}
                            onAction={async () => {
                              if (isPlayerFavorite(item.payload.id)) {
                                await favoriteService.removeItems("player", item.payload.id);
                                showToast({
                                  style: Toast.Style.Success,
                                  title: "Removed from Favorites",
                                });
                                return;
                              }
                              await favoriteService.addItems({
                                type: "player",
                                value: {
                                  id: item.payload.id,
                                  isCoach: item.payload.isCoach || false,
                                  name: item.title,
                                },
                              });
                              showToast({
                                style: Toast.Style.Success,
                                title: "Added to Favorites",
                              });
                            }}
                          />
                        </Fragment>
                      )}
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
          );
        })) || <FavoriteView />}
    </List>
  );
}
