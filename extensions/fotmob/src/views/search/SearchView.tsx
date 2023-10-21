import { Action, ActionPanel, Icon, List, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { useFavorite } from "../../services/useFavorite";
import { useSearch } from "../../services/useSearch";
import FavoriteView from "../favorite/FavoriteView";
import { launchTeamCommand } from "../../utils/launcher/launchTeamDetailCommand";

export default function SearchView() {
  const [searchText, setSearchText] = useState("");
  const favoriteService = useFavorite();

  const searchState = useSearch(searchText);

  const isFavorite = (teamId: string) => {
    const favoritedTeams = favoriteService.teams;
    return favoritedTeams.some((team) => team.id === teamId);
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
                  key={item.title}
                  icon={item.iamgeUrl}
                  title={item.title}
                  subtitle={item.subtitle}
                  accessories={
                    isFavorite(item.payload.id)
                      ? [
                          {
                            icon: Icon.Star,
                          },
                        ]
                      : []
                  }
                  actions={
                    <ActionPanel>
                      {/* <Action.Push title="Show Details" target={<Detail markdown={JSON.stringify(item.raw)} />} /> */}
                      <Action
                        icon={Icon.AppWindowSidebarRight}
                        title="Show Details"
                        onAction={() => {
                          launchTeamCommand(item.payload.id);
                        }}
                      />
                      {item.type === "team" && (
                        <Action
                          icon={isFavorite(item.payload.id) ? Icon.StarDisabled : Icon.Star}
                          title={isFavorite(item.payload.id) ? "Remove From Favorites" : "Add To Favorites"}
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
