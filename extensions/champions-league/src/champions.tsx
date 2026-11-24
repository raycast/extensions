import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getFinals } from "./api";
import ClubProfile from "./components/club_profile";
import MatchActions from "./components/match_actions";
import { Match, Team } from "./types";
import {
  cityName,
  formatKickoff,
  getFlagEmoji,
  scoreline,
  stadiumName,
  teamLogo,
  teamName,
} from "./utils";

const winnerOf = (final: Match): Team | undefined =>
  final.winner?.match?.team ?? final.winner?.aggregate?.team;
const loserOf = (final: Match): Team | undefined => {
  const winner = winnerOf(final);
  if (!winner) return undefined;
  return final.homeTeam.id === winner.id ? final.awayTeam : final.homeTeam;
};

const finalYear = (final: Match) => formatKickoff(final, "yyyy");

/** Name changed from the European Champion Clubs' Cup to the Champions League in 1992/93. */
const eraLabel = (final: Match) =>
  Number(finalYear(final)) >= 1993 ? "Champions League" : "European Cup";

export default function Champions() {
  const [view, setView] = useState<string>("finals");
  const { data: finals = [], isLoading } = useCachedPromise(getFinals);

  // 1974 was replayed: keep only the deciding match of each season.
  const deciders = useMemo(() => {
    const bySeason = new Map<string, Match>();
    for (const final of finals) {
      const existing = bySeason.get(final.seasonYear);
      if (!existing || (winnerOf(final) && !winnerOf(existing))) {
        bySeason.set(final.seasonYear, final);
      }
    }
    return [...bySeason.values()];
  }, [finals]);

  const titles = useMemo(() => {
    const table = new Map<
      string,
      { team: Team; wins: Match[]; losses: Match[] }
    >();
    const entry = (team: Team) => {
      if (!table.has(team.id))
        table.set(team.id, { team, wins: [], losses: [] });
      return table.get(team.id)!;
    };
    for (const final of deciders) {
      const winner = winnerOf(final);
      const loser = loserOf(final);
      if (winner) entry(winner).wins.push(final);
      if (loser) entry(loser).losses.push(final);
    }
    return [...table.values()]
      .filter((t) => t.wins.length > 0)
      .sort(
        (a, b) =>
          b.wins.length - a.wins.length || a.losses.length - b.losses.length,
      );
  }, [deciders]);

  const seasonYearOf = (final: Match) => final.seasonYear;

  return (
    <List
      throttle
      isLoading={isLoading}
      searchBarPlaceholder={
        view === "finals"
          ? "Search finals by club, year or venue"
          : "Search clubs"
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="View"
          value={view}
          onChange={setView}
          storeValue
        >
          <List.Dropdown.Item
            title="All Finals"
            value="finals"
            icon={Icon.Trophy}
          />
          <List.Dropdown.Item
            title="Titles by Club"
            value="titles"
            icon={Icon.Leaderboard}
          />
        </List.Dropdown>
      }
    >
      {view === "finals" ? (
        <List.Section
          title="Finals"
          subtitle={deciders.length ? String(deciders.length) : undefined}
        >
          {deciders.map((final) => {
            const winner = winnerOf(final);
            const loser = loserOf(final);
            const pens =
              Boolean(final.score?.penalty) ||
              final.winner?.match?.reason === "WIN_ON_PENALTIES";
            return (
              <List.Item
                key={final.id}
                icon={teamLogo(winner)}
                title={finalYear(final)}
                subtitle={`${teamName(final.homeTeam)} ${scoreline(final)} ${teamName(final.awayTeam)}`}
                keywords={[
                  teamName(final.homeTeam),
                  teamName(final.awayTeam),
                  stadiumName(final) ?? "",
                  cityName(final) ?? "",
                  eraLabel(final),
                ]}
                accessories={[
                  ...(pens
                    ? [{ tag: { value: "Penalties", color: Color.Orange } }]
                    : []),
                  {
                    text: `${getFlagEmoji(final.stadium?.countryCode)} ${stadiumName(final) ?? ""}`,
                    tooltip: cityName(final),
                  },
                  {
                    icon: { source: Icon.Trophy, tintColor: Color.Yellow },
                    tooltip: `Winner: ${teamName(winner)} · Runner-up: ${teamName(loser)}`,
                  },
                ]}
                actions={
                  <MatchActions
                    match={final}
                    extra={
                      winner && (
                        <ActionPanel.Section title="Winner">
                          <Action.Push
                            title={`${teamName(winner)} Profile`}
                            icon={Icon.Shield}
                            target={
                              <ClubProfile
                                team={winner}
                                seasonYear={seasonYearOf(final)}
                              />
                            }
                          />
                        </ActionPanel.Section>
                      )
                    }
                  />
                }
              />
            );
          })}
        </List.Section>
      ) : (
        <List.Section title="Most Titles">
          {titles.map(({ team, wins, losses }, index) => (
            <List.Item
              key={team.id}
              icon={teamLogo(team)}
              title={`${index + 1}. ${teamName(team)}`}
              subtitle={wins.map(finalYear).sort().join(", ")}
              keywords={[team.internationalName, team.countryCode]}
              accessories={[
                {
                  text: `${losses.length} runner-up`,
                  tooltip: losses.map(finalYear).sort().join(", ") || "None",
                },
                { tag: { value: `🏆 ${wins.length}`, color: Color.Yellow } },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Club Profile"
                    icon={Icon.Sidebar}
                    target={
                      <ClubProfile
                        team={team}
                        seasonYear={wins[0].seasonYear}
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
