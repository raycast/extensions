import { ActionPanel, Action, List, Icon, useNavigation } from "@raycast/api";
import Site from "./Site";
import { useSites } from "../fetchers/sites";
import { type Site as SiteType } from "../types/Site";
import { useLocalStorage } from "@raycast/utils";
import { useMemo } from "react";

export default function FindSite() {
  const { push } = useNavigation();
  const { isLoading, data } = useSites();
  const {
    value: favorites,
    setValue: setFavorites,
    isLoading: isLoadingFavorites,
  } = useLocalStorage<number[]>("favorites", []);

  const { favoriteSites, sites } = (data ?? []).reduce(
    (acc, site) => {
      if (favorites?.includes(site.id)) {
        acc.favoriteSites.push(site);
      } else {
        acc.sites.push(site);
      }
      return acc;
    },
    { favoriteSites: [] as SiteType[], sites: [] as SiteType[] },
  ) ?? { favoriteSites: [], sites: [] };

  const addFavorite = useMemo(
    () => (id: number) => {
      setFavorites([...(favorites ?? []), id]);
    },
    [],
  );

  return (
    <List
      filtering
      isLoading={isLoading || isLoadingFavorites}
      navigationTitle="Search Sites"
      searchBarPlaceholder="Search for sites"
    >
      <List.Section title="Favorite">
        {favoriteSites.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
            accessories={[{ icon: Icon.HeartDisabled }]}
            actions={
              <ActionPanel>
                <Action.Push title="Select" target={<Site site={item} />} />
                <Action
                  title={"Unfavorite"}
                  icon={Icon.HeartDisabled}
                  onAction={() => setFavorites(favorites?.filter((id) => id != item.id) ?? [])}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Sites">
        {sites.map((item) => (
          <List.Item
            key={item.id}
            title={item.name}
            accessories={[{ icon: Icon.Heart }]}
            actions={
              <ActionPanel>
                <Action title="Select" onAction={() => push(<Site site={item} />)} />
                <Action title="Favorite" onAction={() => addFavorite(item.id)} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
