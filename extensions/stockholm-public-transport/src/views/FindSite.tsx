import { ActionPanel, Action, List, Icon, useNavigation, Keyboard } from "@raycast/api";
import { metroSites } from "../fetchers/metroSites";
import { useSites } from "../fetchers/sites";
import { useState } from "react";
import Site from "./Site";

export default function FindSite() {
  const [searchString, setSearchString] = useState("");
  const { push } = useNavigation();
  const { isLoading, data: sites, favorites, favoriteSites, setFavorites, isLoadingFavorites } = useSites();

  const filteredList = sites.filter((v) => {
    if (searchString.length) {
      return v.name.toLowerCase().includes(searchString.toLowerCase());
    } else {
      return metroSites.has(v.id);
    }
  });

  const addFavorite = (id: number) => {
    setFavorites([...(favorites ?? []), id]);
  };

  return (
    <List
      isLoading={isLoading || isLoadingFavorites}
      navigationTitle="Search Sites"
      searchBarPlaceholder="Search for sites"
      onSearchTextChange={setSearchString}
    >
      {searchString.length ? null : (
        <List.Section title="Favorite">
          {favoriteSites.map((item) => (
            <List.Item
              key={item.id}
              title={item.name}
              accessories={[{ icon: Icon.Heart }]}
              actions={
                <ActionPanel>
                  <Action.Push title="Select" target={<Site site={item} />} />
                  <Action
                    title="Unfavorite"
                    shortcut={Keyboard.Shortcut.Common.Pin}
                    icon={Icon.HeartDisabled}
                    onAction={() => setFavorites(favorites?.filter((id) => id !== item.id) ?? [])}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Sites">
        {filteredList.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
            accessories={[{ icon: Icon.HeartDisabled }]}
            actions={
              <ActionPanel>
                <Action title="Select" icon={Icon.ArrowRight} onAction={() => push(<Site site={item} />)} />
                <Action
                  title="Favorite"
                  icon={Icon.Heart}
                  shortcut={Keyboard.Shortcut.Common.Pin}
                  onAction={() => addFavorite(item.id)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
