import { Color, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import json2md from "json2md";
import { getMatch } from "../api";
import { Match, PlayerEvent } from "../types";
import {
  cityName,
  formatKickoff,
  getFlagEmoji,
  isLive,
  liveClock,
  matchTitle,
  playerName,
  roundLabel,
  stadiumName,
  t,
  teamName,
} from "../utils";
import MatchActions from "./match_actions";

const eventMinute = (e: PlayerEvent) =>
  e.time
    ? `${e.time.minute}${e.time.injuryMinute ? `+${e.time.injuryMinute}` : ""}'`
    : "";

const goalLine = (e: PlayerEvent) => {
  const suffix =
    e.goalType === "OWN" ? " (OG)" : e.goalType === "PENALTY" ? " (P)" : "";
  return `${playerName(e.player)}${suffix} ${eventMinute(e)}`;
};

export default function MatchSummary(props: { match: Match }) {
  const { data: match = props.match, isLoading } = useCachedPromise(
    getMatch,
    [props.match.id],
    {
      initialData: props.match,
      keepPreviousData: true,
    },
  );

  const { homeTeam, awayTeam } = match;
  const scorers = match.playerEvents?.scorers ?? [];
  const reds = match.playerEvents?.redCards ?? [];

  const side = (
    teamId: string,
    events: PlayerEvent[],
    fn: (e: PlayerEvent) => string,
  ) => events.filter((e) => e.teamId === teamId).map(fn);

  const homeGoals = side(homeTeam.id, scorers, goalLine);
  const awayGoals = side(awayTeam.id, scorers, goalLine);

  const markdown = json2md([
    { h2: matchTitle(match) },
    {
      p: `![${teamName(homeTeam)}](${homeTeam.mediumLogoUrl}?raycast-height=90)  &nbsp;&nbsp;&nbsp;  ![${teamName(awayTeam)}](${awayTeam.mediumLogoUrl}?raycast-height=90)`,
    },
    ...(scorers.length
      ? [
          { h3: "⚽ Goals" },
          ...(homeGoals.length
            ? [{ p: `**${teamName(homeTeam)}**` }, { ul: homeGoals }]
            : []),
          ...(awayGoals.length
            ? [{ p: `**${teamName(awayTeam)}**` }, { ul: awayGoals }]
            : []),
        ]
      : []),
    ...(reds.length
      ? [
          { h3: "🟥 Red Cards" },
          {
            ul: reds.map(
              (e) =>
                `${playerName(e.player)} (${e.teamId === homeTeam.id ? teamName(homeTeam) : teamName(awayTeam)}) ${eventMinute(e)}`,
            ),
          },
        ]
      : []),
    ...(match.score?.aggregate
      ? [
          {
            blockquote: `Aggregate: ${match.score.aggregate.home} - ${match.score.aggregate.away}`,
          },
        ]
      : []),
  ]);

  const referee = match.referees?.find((r) => r.role === "REFEREE");
  const potm = match.playerOfTheMatch?.player;
  const winner = match.winner?.aggregate?.team ?? match.winner?.match?.team;

  return (
    <Detail
      navigationTitle={`${matchTitle(match)} | Summary`}
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Round" text={roundLabel(match)} />
          {isLive(match) ? (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item
                text={`LIVE ${liveClock(match)}`}
                color={Color.Red}
              />
            </Detail.Metadata.TagList>
          ) : (
            <Detail.Metadata.Label
              title="Status"
              text={
                match.status.charAt(0) + match.status.slice(1).toLowerCase()
              }
            />
          )}
          <Detail.Metadata.Label title="Kick Off" text={formatKickoff(match)} />
          {winner && match.status === "FINISHED" && (
            <Detail.Metadata.Label
              title="Winner"
              text={teamName(winner)}
              icon={winner.logoUrl}
            />
          )}
          <Detail.Metadata.Separator />
          {stadiumName(match) && (
            <Detail.Metadata.Label title="Stadium" text={stadiumName(match)} />
          )}
          {cityName(match) && (
            <Detail.Metadata.Label
              title="City"
              text={`${getFlagEmoji(match.stadium?.countryCode)} ${cityName(match)}`}
            />
          )}
          {match.matchAttendance ? (
            <Detail.Metadata.Label
              title="Attendance"
              text={match.matchAttendance.toLocaleString()}
            />
          ) : null}
          {match.condition?.temperature !== undefined && (
            <Detail.Metadata.Label
              title="Weather"
              text={`${match.condition.temperature}°C ${t(match.condition.translations, "weatherConditionName")}`}
            />
          )}
          {referee && (
            <Detail.Metadata.Label
              title="Referee"
              text={`${getFlagEmoji(referee.person.countryCode)} ${playerName(referee.person)}`}
            />
          )}
          {potm && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Player of the Match"
                text={playerName(potm)}
                icon={potm.imageUrl}
              />
            </>
          )}
        </Detail.Metadata>
      }
      actions={<MatchActions match={match} />}
    />
  );
}
