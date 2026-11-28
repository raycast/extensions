import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { getPlayerRanking, getTeamRanking } from "./api";
import ClubProfile from "./components/club_profile";
import PlayerProfile from "./components/player_profile";
import ErrorView from "./components/error_view";
import { useSeasons } from "./components/searchbar_season";
import {
  getFlagEmoji,
  playerImage,
  playerName,
  seasonLabel,
  statValue,
  teamLogo,
  teamName,
} from "./utils";
import { PlayerRanking, TeamRanking } from "./types";

interface StatOption {
  value: string;
  title: string;
  icon: Image.ImageLike;
  unit?: string;
}

const PLAYER_STATS: StatOption[] = [
  { value: "goals", title: "Goals", icon: Icon.SoccerBall },
  { value: "assists", title: "Assists", icon: Icon.TwoPeople },
  {
    value: "attempts_on_target",
    title: "Shots on Target",
    icon: Icon.BullsEye,
  },
  {
    value: "passes_completed",
    title: "Passes Completed",
    icon: Icon.ArrowRight,
  },
  {
    value: "distance_covered",
    title: "Distance Covered",
    icon: Icon.Footprints,
    unit: "km",
  },
  { value: "top_speed", title: "Top Speed", icon: Icon.Bolt, unit: "km/h" },
  { value: "tackles", title: "Tackles", icon: Icon.Shield },
  { value: "saves", title: "Saves", icon: Icon.Goal },
  { value: "clean_sheet", title: "Clean Sheets", icon: Icon.Lock },
  {
    value: "minutes_played_official",
    title: "Minutes Played",
    icon: Icon.Clock,
    unit: "min",
  },
  {
    value: "yellow_cards",
    title: "Yellow Cards",
    icon: { source: Icon.StopFilled, tintColor: Color.Yellow },
  },
  {
    value: "red_cards",
    title: "Red Cards",
    icon: { source: Icon.StopFilled, tintColor: Color.Red },
  },
];

const TEAM_STATS: StatOption[] = [
  { value: "goals", title: "Goals", icon: Icon.SoccerBall },
  { value: "attempts", title: "Attempts", icon: Icon.BullsEye },
  {
    value: "ball_possession",
    title: "Possession",
    icon: Icon.CircleProgress50,
    unit: "%",
  },
  {
    value: "passes_accuracy",
    title: "Passing Accuracy",
    icon: Icon.ArrowRight,
    unit: "%",
  },
  { value: "clean_sheet", title: "Clean Sheets", icon: Icon.Lock },
  {
    value: "distance_covered",
    title: "Distance Covered",
    icon: Icon.Footprints,
    unit: "km",
  },
];

const medal = (rank: number): Image.ImageLike => {
  const colors = [Color.Yellow, Color.SecondaryText, Color.Orange];
  return rank <= 3
    ? { source: Icon.Trophy, tintColor: colors[rank - 1] }
    : Icon.Dot;
};

export default function Stats() {
  const [selection, setSelection] = useState("player:goals");
  const [seasonYear, setSeasonYear] = useState<string>();
  const {
    seasons,
    error: seasonsError,
    revalidate: retrySeasons,
  } = useSeasons(2000);

  useEffect(() => {
    if (!seasonYear && seasons.length) setSeasonYear(seasons[0].seasonYear);
  }, [seasons, seasonYear]);

  const [kind, stat] = selection.split(":") as ["player" | "team", string];
  const options = kind === "player" ? PLAYER_STATS : TEAM_STATS;
  const option = options.find((o) => o.value === stat) ?? options[0];

  const {
    data: players = [],
    isLoading: loadingPlayers,
    error: playersError,
    revalidate: retryPlayers,
  } = useCachedPromise(
    async (season?: string, s?: string) =>
      season && s ? getPlayerRanking(season, s) : ([] as PlayerRanking[]),
    [seasonYear, stat],
    { execute: kind === "player" },
  );
  const {
    data: teams = [],
    isLoading: loadingTeams,
    error: teamsError,
    revalidate: retryTeams,
  } = useCachedPromise(
    async (season?: string, s?: string) =>
      season && s ? getTeamRanking(season, s) : ([] as TeamRanking[]),
    [seasonYear, stat],
    { execute: kind === "team" },
  );

  const format = (value?: string) =>
    value === undefined
      ? "–"
      : `${value}${option.unit ? ` ${option.unit}` : ""}`;

  const seasonMenu = (
    <ActionPanel.Submenu
      title="Change Season"
      icon={Icon.Calendar}
      shortcut={{
        macOS: { modifiers: ["cmd", "shift"], key: "y" },
        Windows: { modifiers: ["ctrl", "shift"], key: "y" },
      }}
    >
      {seasons.map((s) => (
        <Action
          key={s.seasonYear}
          title={seasonLabel(s.seasonYear, s.shortName)}
          onAction={() => setSeasonYear(s.seasonYear)}
        />
      ))}
    </ActionPanel.Submenu>
  );

  // Ranks are shared on ties, like the official leaderboards.
  const ranks = (values: number[]) =>
    values.map((v, i) => values.indexOf(v) + 1 || i + 1);

  const playerRanks = ranks(
    players.map((p) => Number(statValue(p.statistics, stat) ?? 0)),
  );
  const teamRanks = ranks(
    teams.map((p) => Number(statValue(p.statistics, stat) ?? 0)),
  );

  return (
    <List
      throttle
      isLoading={
        loadingPlayers || loadingTeams || (!seasonYear && !seasonsError)
      }
      searchBarPlaceholder="Search leaderboard"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Statistic"
          value={selection}
          onChange={setSelection}
          storeValue
        >
          <List.Dropdown.Section title="Players">
            {PLAYER_STATS.map((o) => (
              <List.Dropdown.Item
                key={o.value}
                title={o.title}
                value={`player:${o.value}`}
                icon={o.icon}
              />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Clubs">
            {TEAM_STATS.map((o) => (
              <List.Dropdown.Item
                key={o.value}
                title={`Club ${o.title}`}
                value={`team:${o.value}`}
                icon={o.icon}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {seasonsError || (kind === "player" ? playersError : teamsError) ? (
        <ErrorView
          error={
            (seasonsError ?? (kind === "player" ? playersError : teamsError))!
          }
          onRetry={
            seasonsError
              ? retrySeasons
              : kind === "player"
                ? retryPlayers
                : retryTeams
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.BarChart}
          title="No statistics yet"
          actions={<ActionPanel>{seasonMenu}</ActionPanel>}
        />
      )}
      {seasonYear && kind === "player" && (
        <List.Section title={`${option.title} · ${seasonLabel(seasonYear)}`}>
          {players.map((entry, index) => (
            <List.Item
              key={entry.playerId}
              icon={playerImage(entry.player)}
              title={`${playerRanks[index]}. ${playerName(entry.player)}`}
              keywords={[entry.team?.internationalName ?? ""]}
              accessories={[
                { icon: teamLogo(entry.team), tooltip: teamName(entry.team) },
                {
                  text: getFlagEmoji(entry.player?.countryCode),
                  tooltip: entry.player?.countryCode,
                },
                {
                  tag: {
                    value: format(statValue(entry.statistics, stat)),
                    color: Color.PrimaryText,
                  },
                  icon: medal(playerRanks[index]),
                },
              ]}
              actions={
                <ActionPanel>
                  {entry.player && (
                    <Action.Push
                      title="View Profile"
                      icon={Icon.Person}
                      target={
                        <PlayerProfile
                          player={entry.player}
                          seasonYear={seasonYear}
                        />
                      }
                    />
                  )}
                  {seasonMenu}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {seasonYear && kind === "team" && (
        <List.Section
          title={`Club ${option.title} · ${seasonLabel(seasonYear)}`}
        >
          {teams.map((entry, index) => (
            <List.Item
              key={entry.teamId}
              icon={teamLogo(entry.team)}
              title={`${teamRanks[index]}. ${teamName(entry.team)}`}
              accessories={[
                {
                  tag: {
                    value: format(statValue(entry.statistics, stat)),
                    color: Color.PrimaryText,
                  },
                  icon: medal(teamRanks[index]),
                },
              ]}
              actions={
                <ActionPanel>
                  {entry.team && (
                    <Action.Push
                      title="Club Profile"
                      icon={Icon.Sidebar}
                      target={
                        <ClubProfile
                          team={entry.team}
                          seasonYear={seasonYear}
                        />
                      }
                    />
                  )}
                  {seasonMenu}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
