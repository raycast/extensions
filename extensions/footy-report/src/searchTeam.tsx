import {
  Action,
  ActionPanel,
  Icon,
  Image,
  LaunchProps,
  List,
  LocalStorage,
  Toast,
  showToast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import TeamDetails from "@src/components/TeamDetails";
import { useErrorToast, useFetchTeams } from "@src/hooks";
import { Team } from "@src/types";
import { useState } from "react";

export default (props: LaunchProps<{ arguments: Arguments.SearchTeam }>) => {
  const { team } = props.arguments;
  const [searchText, setSearchText] = useState<string>(team || "");
  const {
    data: favoritesCached,
    isLoading: favoritesLoading,
    revalidate,
  } = useCachedPromise(async () => {
    return LocalStorage.getItem<string>("favorite-teams");
  });
  const {
    data: teamsFound,
    isLoading: teamsLoading,
    error,
  } = useFetchTeams(searchText, {
    image_path: true,
  });

  useErrorToast(error);

  const favoriteTeams: Team[] = favoritesCached
    ? JSON.parse(favoritesCached)
    : [];

  if (Boolean(searchText) === false) {
    return (
      <List
        isLoading={favoritesLoading || teamsLoading}
        navigationTitle="Search Team"
        searchBarPlaceholder="Enter Team"
        onSearchTextChange={setSearchText}
        searchText={searchText}
      >
        {favoriteTeams.length === 0 ? (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="What team would you like to search for?"
          />
        ) : (
          <List.Section
            title="Favorited Teams"
            subtitle={favoriteTeams.length.toString()}
          >
            {favoriteTeams.map((favTeam) => {
              return (
                <List.Item
                  title={favTeam.name}
                  key={favTeam.id}
                  icon={{
                    mask: Image.Mask.Circle,
                    source: favTeam.image_path,
                  }}
                  actions={
                    <ActionPanel title="Team actions">
                      <Action.Push
                        title="Select Team"
                        icon={Icon.ArrowRightCircleFilled}
                        target={<TeamDetails team={favTeam} />}
                      />
                      <Action
                        title="Remove Favorite"
                        icon={Icon.StarDisabled}
                        onAction={async () => {
                          const newList = favoriteTeams.filter(
                            (team) => team.name !== favTeam.name,
                          );
                          LocalStorage.setItem(
                            "favorite-teams",
                            JSON.stringify(newList),
                          );
                          revalidate();
                          await showToast({
                            style: Toast.Style.Success,
                            title: `${favTeam.name} removed from favorites!`,
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
        isLoading={teamsLoading || favoritesLoading}
        navigationTitle="Teams Found"
        searchBarPlaceholder="Enter Team"
        onSearchTextChange={setSearchText}
        searchText={searchText}
      >
        {teamsFound.length === 0 ? (
          <List.EmptyView
            icon={Icon.XMarkCircleFilled}
            title={`Whoops! No teams found with the name: ${searchText}`}
          />
        ) : (
          teamsFound.map((team) => {
            return (
              <List.Item
                key={team.id}
                title={team.name}
                icon={{ mask: Image.Mask.Circle, source: team.image_path }}
                actions={
                  <ActionPanel title="Team Actions">
                    <Action.Push
                      title="Select Team"
                      icon={Icon.ArrowRightCircleFilled}
                      target={<TeamDetails team={team} />}
                    />
                    <Action
                      title="Favorite Team"
                      icon={Icon.Star}
                      onAction={async () => {
                        await LocalStorage.setItem(
                          "favorite-teams",
                          JSON.stringify([...favoriteTeams, team]),
                        );
                        revalidate();
                        await showToast({
                          style: Toast.Style.Success,
                          title: `${team.name} add to favorites!`,
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
