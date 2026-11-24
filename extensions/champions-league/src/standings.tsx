import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getAllMatches, getStandings } from "./api";
import ClubProfile from "./components/club_profile";
import ClubMatches from "./components/club_matches";
import SearchBarSeason from "./components/searchbar_season";
import { Match, Standing, StandingItem } from "./types";
import {
  formatKickoff,
  isFinished,
  stadiumName,
  teamLogo,
  teamName,
} from "./utils";

/** The 36-team league phase started in 2024/25 (UEFA season year 2025). */
const LEAGUE_PHASE_FROM = 2025;
/** Standings exist from the 1991/92 group stage onwards. */
const FIRST_STANDINGS_SEASON = 1992;

interface Zone {
  label: string;
  color: Color;
}

const zoneFor = (
  rank: number,
  standing: Standing,
  seasonYear: number,
  isLeaguePhase: boolean,
  isFinalStage: boolean,
): Zone | undefined => {
  if (isLeaguePhase) {
    if (rank <= 8) return { label: "Round of 16", color: Color.Green };
    if (rank <= 24) return { label: "Knockout Play-offs", color: Color.Blue };
    return { label: "Eliminated", color: Color.Red };
  }
  const qualified = standing.group.teamsQualifiedNumber ?? 2;
  if (rank <= qualified) return { label: "Knockout Stage", color: Color.Green };
  // Third place dropped into the UEFA Cup (2000–2009) and then the Europa League (2010–2024).
  if (rank === qualified + 1 && !isFinalStage && seasonYear >= 2000) {
    return {
      label: seasonYear >= 2010 ? "Europa League" : "UEFA Cup",
      color: Color.Orange,
    };
  }
  return undefined;
};

const formFor = (teamId: string, matches: Match[]) =>
  matches
    .filter(
      (m) => isFinished(m) && [m.homeTeam.id, m.awayTeam.id].includes(teamId),
    )
    .slice(-5)
    .map((m) => {
      const isHome = m.homeTeam.id === teamId;
      const { home = 0, away = 0 } = m.score?.total ?? {};
      const diff = isHome ? home - away : away - home;
      const result = diff > 0 ? "W" : diff < 0 ? "L" : "D";
      const color =
        diff > 0 ? Color.Green : diff < 0 ? Color.Red : Color.SecondaryText;
      const opponent = isHome ? m.awayTeam : m.homeTeam;
      return {
        id: m.id,
        result,
        color,
        tooltip: `${isHome ? "vs" : "@"} ${teamName(opponent)} ${home}-${away}`,
      };
    });

const trendIcon = (item: StandingItem): Image.ImageLike => {
  if (item.rankTrend === "UP")
    return { source: Icon.ChevronUpSmall, tintColor: Color.Green };
  if (item.rankTrend === "DOWN")
    return { source: Icon.ChevronDownSmall, tintColor: Color.Red };
  return { source: Icon.Dot, tintColor: Color.SecondaryText };
};

export default function Standings() {
  const [seasonYear, setSeasonYear] = useState<string>();

  const { data: standings = [], isLoading } = useCachedPromise(
    async (season?: string) =>
      season ? getStandings(season) : ([] as Standing[]),
    [seasonYear],
    { keepPreviousData: true },
  );

  // Fetch the group/league phase matches once to derive form and next fixtures.
  const roundIds = [...new Set(standings.map((s) => s.group.roundId))];
  const roundId = roundIds.join(",");
  const { data: phaseMatches = [] } = useCachedPromise(
    async (season?: string, round?: string) =>
      season && round
        ? getAllMatches({ seasonYear: season, roundId: round, order: "ASC" })
        : ([] as Match[]),
    [seasonYear, roundId],
  );

  const isLeaguePhase = Number(seasonYear) >= LEAGUE_PHASE_FROM;

  return (
    <List
      throttle
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search clubs"
      searchBarAccessory={
        <SearchBarSeason
          selected={seasonYear}
          onSelect={setSeasonYear}
          minSeasonYear={FIRST_STANDINGS_SEASON}
        />
      }
    >
      <List.EmptyView icon={Icon.List} title="No standings for this season" />
      {standings.map((standing) => (
        <List.Section
          key={standing.group.id}
          title={
            isLeaguePhase
              ? "League Phase"
              : `${roundIds.length > 1 ? `Stage ${roundIds.indexOf(standing.group.roundId) + 1} · ` : ""}${standing.group.metaData.groupName.replace(/\s+/g, " ")}`
          }
        >
          {standing.items.map((item) => {
            const { team } = item;
            const zone = zoneFor(
              item.rank,
              standing,
              Number(seasonYear),
              isLeaguePhase,
              roundIds.indexOf(standing.group.roundId) > 0,
            );
            const form = formFor(team.id, phaseMatches);
            const next = phaseMatches.find(
              (m) =>
                !isFinished(m) &&
                [m.homeTeam.id, m.awayTeam.id].includes(team.id),
            );

            const accessories: List.Item.Accessory[] = [
              {
                text: { value: String(item.points), color: Color.PrimaryText },
                tooltip: "Points",
              },
            ];
            if (item.isLive) {
              accessories.unshift({ tag: { value: "LIVE", color: Color.Red } });
            }
            if (seasonYear && item.previousRank) {
              accessories.push({
                icon: trendIcon(item),
                tooltip: `Previous position: ${item.previousRank}`,
              });
            }

            return (
              <List.Item
                key={team.id}
                title={String(item.rank)}
                subtitle={teamName(team)}
                keywords={[
                  teamName(team),
                  team.internationalName,
                  team.teamCode,
                ]}
                icon={teamLogo(team)}
                accessories={accessories}
                detail={
                  <List.Item.Detail
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Played"
                          text={String(item.played)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Won"
                          text={String(item.won)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Drawn"
                          text={String(item.drawn)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Lost"
                          text={String(item.lost)}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Goals For"
                          text={String(item.goalsFor)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Goals Against"
                          text={String(item.goalsAgainst)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Goal Difference"
                          text={`${item.goalDifference > 0 ? "+" : ""}${item.goalDifference}`}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Points"
                          text={String(item.points)}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        {form.length > 0 && (
                          <List.Item.Detail.Metadata.TagList title="Form">
                            {form.map((f) => (
                              <List.Item.Detail.Metadata.TagList.Item
                                key={f.id}
                                text={f.result}
                                color={f.color}
                              />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                        )}
                        {zone && (
                          <List.Item.Detail.Metadata.TagList title="Qualification">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={zone.label}
                              color={zone.color}
                            />
                          </List.Item.Detail.Metadata.TagList>
                        )}
                        {next && (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label
                              title="Next Fixture"
                              text={`${teamName(next.homeTeam)} - ${teamName(next.awayTeam)}`}
                            />
                            <List.Item.Detail.Metadata.Label
                              title="Kick Off"
                              text={formatKickoff(next)}
                            />
                            {stadiumName(next) && (
                              <List.Item.Detail.Metadata.Label
                                title="Stadium"
                                text={stadiumName(next)}
                              />
                            )}
                          </>
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  seasonYear && (
                    <ActionPanel>
                      <Action.Push
                        title="Club Profile"
                        icon={Icon.Sidebar}
                        target={
                          <ClubProfile team={team} seasonYear={seasonYear} />
                        }
                      />
                      <Action.Push
                        title="Club Matches"
                        icon={Icon.Calendar}
                        target={
                          <ClubMatches team={team} seasonYear={seasonYear} />
                        }
                      />
                    </ActionPanel>
                  )
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
