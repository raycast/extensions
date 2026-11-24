import { Action, ActionPanel, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import json2md from "json2md";
import {
  getPlayer,
  getPlayerCareer,
  getPlayerSeasonStats,
  getTeam,
} from "../api";
import { Person } from "../types";
import {
  formatDate,
  getFlagEmoji,
  playerName,
  playerUrl,
  positionLabel,
  seasonLabel,
  statLabel,
  statValue,
  t,
  teamName,
} from "../utils";

export default function PlayerProfile(props: {
  player: Person;
  seasonYear: string;
}) {
  const { seasonYear } = props;

  const { data: player = props.player, isLoading: loadingPlayer } =
    useCachedPromise(
      async (id: string) => (await getPlayer(id)) ?? props.player,
      [props.player.id],
    );
  const { data: seasonStats, isLoading: loadingStats } = useCachedPromise(
    getPlayerSeasonStats,
    [seasonYear, props.player.id],
  );
  const { data: career = [], isLoading: loadingCareer } = useCachedPromise(
    getPlayerCareer,
    [props.player.id],
  );
  const { data: club } = useCachedPromise(
    async (id?: string) => (id ? await getTeam(id) : undefined),
    [player.clubId],
  );

  const totals = career.reduce(
    (acc, season) => {
      acc.apps += Number(
        statValue(season.statistics, "matches_appearance") ?? 0,
      );
      acc.goals += Number(statValue(season.statistics, "goals") ?? 0);
      acc.assists += Number(statValue(season.statistics, "assists") ?? 0);
      return acc;
    },
    { apps: 0, goals: 0, assists: 0 },
  );

  const seasonRows = (seasonStats?.statistics ?? [])
    .filter((s) => s.value !== undefined)
    .map((s) => [statLabel(s), s.value]);

  const markdown = json2md([
    { h1: playerName(player) },
    ...(player.imageUrl
      ? [
          {
            img: {
              source: `${player.imageUrl}?raycast-height=180`,
              title: playerName(player),
            },
          },
        ]
      : []),
    ...(seasonRows.length
      ? [
          { h3: `${seasonLabel(seasonYear)} Season` },
          { table: { headers: ["Stat", "Value"], rows: seasonRows } },
        ]
      : []),
    ...(career.length
      ? [
          { h3: "Champions League Career" },
          {
            table: {
              headers: ["Season", "Apps", "Goals", "Assists", "Minutes"],
              rows: career.map((c) => [
                seasonLabel(c.seasonYear),
                statValue(c.statistics, "matches_appearance") ?? "0",
                statValue(c.statistics, "goals") ?? "0",
                statValue(c.statistics, "assists") ?? "0",
                statValue(c.statistics, "minutes_played_official") ?? "0",
              ]),
            },
          },
        ]
      : []),
  ]);

  return (
    <Detail
      navigationTitle={`${playerName(player)} | Profile`}
      isLoading={loadingPlayer || loadingStats || loadingCareer}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {club && (
            <Detail.Metadata.Label
              title="Club"
              text={teamName(club)}
              icon={club.logoUrl}
            />
          )}
          <Detail.Metadata.Label
            title="Position"
            text={positionLabel(player.fieldPosition)}
          />
          {player.clubJerseyNumber && (
            <Detail.Metadata.Label
              title="Shirt Number"
              text={player.clubJerseyNumber}
            />
          )}
          <Detail.Metadata.Label
            title="Nationality"
            text={`${getFlagEmoji(player.countryCode)} ${t(player.translations, "countryName", player.countryCode ?? "")}`}
          />
          {player.birthDate && (
            <Detail.Metadata.Label
              title="Date of Birth"
              text={`${formatDate(player.birthDate)}${player.age ? ` (${player.age})` : ""}`}
            />
          )}
          {player.height ? (
            <Detail.Metadata.Label
              title="Height"
              text={`${player.height} cm`}
            />
          ) : null}
          {player.weight ? (
            <Detail.Metadata.Label
              title="Weight"
              text={`${player.weight} kg`}
            />
          ) : null}
          {career.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="UCL Seasons"
                text={String(career.length)}
              />
              <Detail.Metadata.Label
                title="UCL Appearances"
                text={String(totals.apps)}
              />
              <Detail.Metadata.Label
                title="UCL Goals"
                text={String(totals.goals)}
              />
              <Detail.Metadata.Label
                title="UCL Assists"
                text={String(totals.assists)}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={playerUrl(player)} />
        </ActionPanel>
      }
    />
  );
}
