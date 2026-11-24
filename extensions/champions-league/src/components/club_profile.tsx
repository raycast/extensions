import { Action, ActionPanel, Color, Detail, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import json2md from "json2md";
import { getFinals, getMatches, getSquad, getTeamSeasonStats } from "../api";
import { Team } from "../types";
import {
  clubUrl,
  formatKickoff,
  getFlagEmoji,
  matchTitle,
  playerName,
  seasonLabel,
  stadiumName,
  statLabel,
  t,
  teamName,
} from "../utils";
import ClubMatches from "./club_matches";
import ClubSquad from "./squad";

export default function ClubProfile({
  team,
  seasonYear,
}: {
  team: Team;
  seasonYear: string;
}) {
  // Older seasons have no stats or registered squads, so treat failures as "no data" rather than errors.
  const { data: stats, isLoading: loadingStats } = useCachedPromise(
    (season: string, teamId: string) =>
      getTeamSeasonStats(season, teamId).catch(() => undefined),
    [seasonYear, team.id],
  );
  const { data: squad } = useCachedPromise(
    (season: string, teamId: string) =>
      getSquad(season, teamId).catch(() => undefined),
    [seasonYear, team.id],
  );
  const { data: finals = [], isLoading: loadingFinals } =
    useCachedPromise(getFinals);
  const { data: recent, isLoading: loadingRecent } = useCachedPromise(
    (season: string, teamId: string) =>
      getMatches(
        { seasonYear: season, teamId, status: "FINISHED", order: "DESC" },
        0,
        5,
      ),
    [seasonYear, team.id],
  );
  const { data: home } = useCachedPromise(
    async (teamId: string) => {
      // The club's home ground isn't on the team object, so take it from a recent home match.
      const { data } = await getMatches(
        { teamId, order: "DESC", status: "FINISHED" },
        0,
        10,
      );
      return data.find((m) => m.homeTeam.id === teamId && m.stadium);
    },
    [team.id],
  );

  const won = finals.filter(
    (f) => (f.winner?.match?.team ?? f.winner?.aggregate?.team)?.id === team.id,
  );
  const lost = finals.filter(
    (f) =>
      [f.homeTeam.id, f.awayTeam.id].includes(team.id) &&
      !won.some((w) => w.id === f.id),
  );

  const coach =
    squad?.coaches?.find((c) => c.role === "COACH") ?? squad?.coaches?.[0];

  const markdown = json2md([
    { h1: teamName(team) },
    {
      img: {
        source: `${team.bigLogoUrl}?raycast-height=160`,
        title: teamName(team),
      },
    },
    ...(stats?.statistics?.length
      ? [
          { h3: `${seasonLabel(seasonYear)} Season` },
          {
            table: {
              headers: ["Stat", "Value"],
              rows: stats.statistics.map((s) => [statLabel(s), s.value]),
            },
          },
        ]
      : []),
    ...(recent?.data.length
      ? [
          { h3: "Recent Results" },
          {
            ul: recent.data.map(
              (m) => `${formatKickoff(m, "d MMM")} — ${matchTitle(m)}`,
            ),
          },
        ]
      : []),
  ]);

  return (
    <Detail
      navigationTitle={`${teamName(team)} | Club`}
      isLoading={loadingStats || loadingFinals || loadingRecent}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Official Name"
            text={t(
              team.translations,
              "displayOfficialName",
              team.internationalName,
            )}
          />
          <Detail.Metadata.Label
            title="Country"
            text={`${getFlagEmoji(team.countryCode)} ${t(team.translations, "countryName", team.countryCode)}`}
          />
          <Detail.Metadata.Label title="Code" text={team.teamCode} />
          {coach && (
            <Detail.Metadata.Label
              title="Coach"
              text={playerName(coach.person)}
              icon={coach.imageUrl}
            />
          )}
          {home?.stadium && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Stadium" text={stadiumName(home)} />
              {home.stadium.capacity ? (
                <Detail.Metadata.Label
                  title="Capacity"
                  text={home.stadium.capacity.toLocaleString()}
                />
              ) : null}
              {home.stadium.openingDate && (
                <Detail.Metadata.Label
                  title="Opened"
                  text={home.stadium.openingDate.slice(0, 4)}
                />
              )}
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="European Cups">
            <Detail.Metadata.TagList.Item
              text={`🏆 ${won.length}`}
              color={won.length ? Color.Yellow : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          {won.length > 0 && (
            <Detail.Metadata.Label
              title="Titles"
              text={won
                .map((f) => formatKickoff(f, "yyyy"))
                .reverse()
                .join(", ")}
            />
          )}
          {lost.length > 0 && (
            <Detail.Metadata.Label
              title="Runner-up"
              text={String(lost.length)}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Squad"
            icon={Icon.TwoPeople}
            target={<ClubSquad team={team} seasonYear={seasonYear} />}
          />
          <Action.Push
            title="Matches"
            icon={Icon.Calendar}
            shortcut={{
              macOS: { modifiers: ["cmd"], key: "m" },
              Windows: { modifiers: ["ctrl"], key: "m" },
            }}
            target={<ClubMatches team={team} seasonYear={seasonYear} />}
          />
          <Action.OpenInBrowser url={clubUrl(team)} />
        </ActionPanel>
      }
    />
  );
}
