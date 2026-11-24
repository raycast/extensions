import { Action, ActionPanel, Grid, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getRegisteredPlayers, getTeams } from "./api";
import PlayerProfile from "./components/player_profile";
import ErrorView from "./components/error_view";
import SearchBarSeason, { useSeasons } from "./components/searchbar_season";
import {
  getFlagEmoji,
  playerImage,
  playerName,
  playerUrl,
  POSITIONS,
  positionLabel,
  teamName,
} from "./utils";
import { Player, Team } from "./types";

const MIN_CHARS = 3;
const MAX_RESULTS = 60;

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export default function Players() {
  const [seasonYear, setSeasonYear] = useState<string>();
  const [terms, setTerms] = useState("");

  const seasons = useSeasons();
  const {
    data: players = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(
    async (season?: string) =>
      season ? getRegisteredPlayers(season) : ([] as Player[]),
    [seasonYear],
    { keepPreviousData: true },
  );
  const { data: teams = [] } = useCachedPromise(
    async (season?: string) => (season ? getTeams(season) : ([] as Team[])),
    [seasonYear],
  );

  const teamById = useMemo(
    () => new Map(teams.map((team) => [team.id, team])),
    [teams],
  );

  const results = useMemo(() => {
    const query = normalize(terms.trim());
    if (query.length < MIN_CHARS) return [];
    return players
      .filter((p) =>
        [playerName(p), p.internationalName ?? "", p.clubShirtName ?? ""].some(
          (name) => normalize(name).includes(query),
        ),
      )
      .slice(0, MAX_RESULTS);
  }, [players, terms]);

  return (
    <Grid
      throttle
      columns={6}
      aspectRatio="3/4"
      fit={Grid.Fit.Fill}
      isLoading={isLoading || (!seasonYear && !seasons.error)}
      filtering={false}
      searchText={terms}
      onSearchTextChange={setTerms}
      searchBarPlaceholder={`Search ${players.length ? players.length.toLocaleString() + " " : ""}registered players`}
      searchBarAccessory={
        <SearchBarSeason grid selected={seasonYear} onSelect={setSeasonYear} />
      }
    >
      {seasons.error || error ? (
        <ErrorView
          grid
          error={(seasons.error ?? error)!}
          onRetry={seasons.error ? seasons.revalidate : revalidate}
        />
      ) : terms.trim().length < MIN_CHARS ? (
        <Grid.EmptyView
          icon={Icon.MagnifyingGlass}
          title={`Type at least ${MIN_CHARS} characters to search players`}
        />
      ) : (
        <Grid.EmptyView icon={Icon.Person} title="No players found" />
      )}
      {seasonYear &&
        POSITIONS.map((position) => {
          const inPosition = results.filter(
            (p) => p.fieldPosition === position,
          );
          return (
            <Grid.Section key={position} title={positionLabel(position)}>
              {inPosition.map((player) => {
                const club = player.clubId
                  ? teamById.get(player.clubId)
                  : undefined;
                return (
                  <Grid.Item
                    key={player.id}
                    title={playerName(player)}
                    subtitle={`${getFlagEmoji(player.countryCode)} ${club ? teamName(club) : ""}`}
                    content={playerImage(player)}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Profile"
                          icon={Icon.Sidebar}
                          target={
                            <PlayerProfile
                              player={player}
                              seasonYear={seasonYear}
                            />
                          }
                        />
                        <Action.OpenInBrowser url={playerUrl(player)} />
                      </ActionPanel>
                    }
                  />
                );
              })}
            </Grid.Section>
          );
        })}
    </Grid>
  );
}
