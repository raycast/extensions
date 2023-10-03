import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { useFavorite } from "../../services/useFavorite";
import { useSearch } from "../../services/useSearch";
import FavoriteView from "../favorite/FavoriteView";
import { launchTeamCommand } from "../../utils/launcher/launchTeamDetailCommand";

export default function SearchView() {
  const [searchText, setSearchText] = useState("");
  const favoriteService = useFavorite();

  const searchState = useSearch(searchText);

  return (
    <List
      searchBarPlaceholder="Search for Clubs, Leagues, and Players"
      filtering={false}
      navigationTitle="Search"
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      {searchText.length === 0 && <FavoriteView />}
      {searchState.result.length !== 0 &&
        searchState.result.map((section) => {
          return (
            <List.Section title={section.title} key={section.title}>
              {section.items.map((item) => (
                <List.Item
                  key={item.title}
                  icon={item.iamgeUrl}
                  title={item.title}
                  subtitle={item.subtitle}
                  accessories={item.accessories}
                  actions={
                    <ActionPanel>
                      {/* <Action.Push title="Show Details" target={<Detail markdown={JSON.stringify(item.raw)} />} /> */}
                      <Action
                        title="Show Details"
                        onAction={() => {
                          launchTeamCommand(item.payload.id);
                        }}
                      />
                      {item.type === "team" && (
                        <Action
                          title="Add to Favorites"
                          onAction={async () => {
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
        })}
    </List>
  );
}
