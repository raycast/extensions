import {
  Action,
  ActionPanel,
  Icon,
  Image,
  List,
  LocalStorage,
  Toast,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useErrorToast, useFetchLeagues } from "@src/hooks";
import { useState } from "react";
import { League } from "@src/types";
import Standings from "@src/components/Standings";

export default () => {
  const {
    data: favoritesCached,
    isLoading: favoritesLoading,
    revalidate,
  } = useCachedPromise(async () => {
    return LocalStorage.getItem<string>("favorite-leagues");
  });
  const [searchText, setSearchText] = useState<string>("");
  const { data, isLoading, error } = useFetchLeagues(searchText);

  useErrorToast(error);

  const favoriteLeagues: League[] = favoritesCached
    ? JSON.parse(favoritesCached)
    : [];

  if (Boolean(searchText) === false) {
    return (
      <List
        isLoading={favoritesLoading || isLoading}
        navigationTitle="Search League"
        searchBarPlaceholder="Enter League"
        onSearchTextChange={setSearchText}
        searchText={searchText}
      >
        {data.length === 0 ? (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="What league would you like to search for?"
          />
        ) : (
          <List.Section
            title="Favorited Leagues"
            subtitle={favoriteLeagues.length.toString()}
          >
            {favoriteLeagues.map((favLeague) => {
              return (
                <List.Item
                  title={favLeague.name}
                  key={favLeague.id}
                  icon={{
                    mask: Image.Mask.Circle,
                    source: favLeague.image_path,
                  }}
                  actions={
                    <ActionPanel title="League actions">
                      <Action
                        title="Remove Favorite"
                        icon={Icon.StarDisabled}
                        onAction={async () => {
                          const newList = favoriteLeagues.filter(
                            (league) => league.name !== favLeague.name,
                          );
                          LocalStorage.setItem(
                            "favorite-teams",
                            JSON.stringify(newList),
                          );
                          revalidate();
                          await showToast({
                            style: Toast.Style.Success,
                            title: `${favLeague.name} removed from favorites!`,
                          });
                        }}
                      />
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        )}
      </List>
    );
  }

  if (searchText) {
    return (
      <List
        throttle
        isLoading={isLoading || favoritesLoading}
        navigationTitle="Leagues Found"
        searchBarPlaceholder="Enter League"
        onSearchTextChange={setSearchText}
        searchText={searchText}
      >
        {data.length === 0 ? (
          <List.EmptyView
            icon={Icon.XMarkCircleFilled}
            title={`Whoops! No leagues found with the name: ${searchText}`}
          />
        ) : (
          data.map((league) => {
            return (
              <List.Item
                key={league.id}
                title={league.name}
                icon={{ mask: Image.Mask.Circle, source: league.image_path }}
                actions={
                  <ActionPanel title="League Actions">
                    <Action.Push
                      title="View League Standing"
                      icon={Icon.ArrowRightCircleFilled}
                      target={<Standings seasonId={league.season?.id || ""} />}
                    />
                    <Action
                      title="Favorite League"
                      icon={Icon.Star}
                      onAction={async () => {
                        await LocalStorage.setItem(
                          "favorite-leagues",
                          JSON.stringify([...favoriteLeagues, league]),
                        );
                        revalidate();
                        await showToast({
                          style: Toast.Style.Success,
                          title: `${league.name} add to favorites!`,
                        });
                      }}
                    />
                  </ActionPanel>
                }
              />
            );
          })
        )}
      </List>
    );
  }
};
