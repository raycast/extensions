import {
  Action,
  ActionPanel,
  Icon,
  Image,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { leagueLogo, leagueUrl, search, teamCrest, teamUrl } from "./fotmob";
import { useFavorites } from "./store";

type RowProps = {
  icon: Image.ImageLike;
  name: string;
  subtitle?: string;
  url: string;
  isFavorite: boolean;
  showStar: boolean;
  onToggle: () => Promise<void>;
};

function Row({
  icon,
  name,
  subtitle,
  url,
  isFavorite,
  showStar,
  onToggle,
}: RowProps) {
  return (
    <List.Item
      icon={icon}
      title={name}
      subtitle={subtitle}
      accessories={showStar ? [{ icon: Icon.Star }] : undefined}
      actions={
        <ActionPanel>
          <Action
            title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
            icon={isFavorite ? Icon.StarDisabled : Icon.Star}
            onAction={async () => {
              await onToggle();
              await showToast({
                style: Toast.Style.Success,
                title: isFavorite
                  ? "Removed from Favorites"
                  : "Added to Favorites",
                message: name,
              });
            }}
          />
          <Action.OpenInBrowser title="Open in FotMob" url={url} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { favorites, isLoading, isTeam, isLeague, toggleTeam, toggleLeague } =
    useFavorites();

  const searching = searchText.trim().length > 1;
  const { data: results, isLoading: isSearching } = useCachedPromise(
    search,
    [searchText.trim()],
    {
      execute: searching,
      keepPreviousData: true,
      onError: (error) => {
        showFailureToast(error, { title: "Search failed" });
      },
    },
  );

  const teams = searching ? (results?.teams ?? []) : favorites.teams;
  const leagues = searching ? (results?.leagues ?? []) : favorites.leagues;

  return (
    <List
      isLoading={isLoading || isSearching}
      throttle
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search teams or leagues…"
    >
      <List.Section title="Teams">
        {teams.map((team) => (
          <Row
            key={team.id}
            icon={teamCrest(team.id)}
            name={team.name}
            subtitle={team.leagueName}
            url={teamUrl(team.id)}
            isFavorite={isTeam(team.id)}
            showStar={searching && isTeam(team.id)}
            onToggle={() => toggleTeam(team)}
          />
        ))}
      </List.Section>
      <List.Section title="Leagues">
        {leagues.map((league) => (
          <Row
            key={league.id}
            icon={leagueLogo(league.id)}
            name={league.name}
            subtitle={league.ccode}
            url={leagueUrl(league.id)}
            isFavorite={isLeague(league.id)}
            showStar={searching && isLeague(league.id)}
            onToggle={() => toggleLeague(league)}
          />
        ))}
      </List.Section>
      {searching ? (
        <List.EmptyView title="No matches" />
      ) : (
        <List.EmptyView
          title="No favorites yet"
          description="Search for a team or league to add it."
        />
      )}
    </List>
  );
}
