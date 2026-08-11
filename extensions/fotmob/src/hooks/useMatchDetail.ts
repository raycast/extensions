import { useCachedPromise } from "@raycast/utils";
import type { MatchDetailData, MatchEvent, MatchStats } from "@/types/match-detail";
import {
  type JsonRecord,
  fetchFotmobPageProps,
  getBoolean,
  getNumber,
  getRecord,
  getString,
  isRecord,
} from "@/utils/fotmob-client";
import { buildMatchDetailUrl } from "@/utils/url-builder";

function getStatPair(value: unknown) {
  if (!Array.isArray(value) || value.length < 2) return undefined;
  return {
    home: getNumber(value[0]),
    away: getNumber(value[1]),
  };
}

function normalizeKey(value: unknown) {
  return getString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const STAT_MATCHERS: { field: keyof MatchStats; matches: (key: string, title: string) => boolean }[] = [
  { field: "possession", matches: (key, title) => key.includes("ballpossesion") || title.includes("possession") },
  { field: "shots", matches: (key, title) => key === "totalshots" || title === "totalshots" },
  { field: "shotsOnTarget", matches: (key, title) => key.includes("shotsontarget") || title.includes("shotsontarget") },
  { field: "corners", matches: (key, title) => key.includes("corner") || title.includes("corner") },
  { field: "fouls", matches: (key, title) => key.includes("foul") || title.includes("foul") },
  { field: "yellowCards", matches: (key, title) => key.includes("yellow") || title.includes("yellowcards") },
  { field: "redCards", matches: (key, title) => key.includes("red") || title.includes("redcards") },
  { field: "passes", matches: (key, title) => key === "passes" || title === "passes" },
  { field: "passAccuracy", matches: (key, title) => title.includes("passaccuracy") || key.includes("accuratepasses") },
];

function transformStats(content: JsonRecord | undefined): MatchStats | undefined {
  const stats = content ? getRecord(content, "stats") : undefined;
  const periods = stats ? getRecord(stats, "Periods") : undefined;
  const all = periods ? getRecord(periods, "All") : undefined;
  const groups = all?.stats;

  if (!Array.isArray(groups)) return undefined;

  const result: MatchStats = {};

  groups.forEach((group) => {
    if (!isRecord(group) || !Array.isArray(group.stats)) return;

    group.stats.forEach((stat) => {
      if (!isRecord(stat)) return;

      const key = normalizeKey(stat.key);
      const title = normalizeKey(stat.title);
      const pair = getStatPair(stat.stats);
      if (!pair) return;

      const matcher = STAT_MATCHERS.find((entry) => entry.matches(key, title));
      if (matcher) {
        result[matcher.field] = pair;
      }
    });
  });

  return Object.keys(result).length > 0 ? result : undefined;
}

function mapEventType(rawType: unknown, ownGoal: unknown): MatchEvent["type"] | undefined {
  const type = getString(rawType).toLowerCase();

  if (ownGoal === true) return "own_goal";
  if (type.includes("goal")) return "goal";
  if (type.includes("card")) return "card";
  if (type.includes("substitution") || type.includes("sub")) return "substitution";
  if (type.includes("penalty")) return "penalty";
  if (type.includes("var")) return "var";

  return undefined;
}

function getEventsArray(matchFacts: JsonRecord | undefined): unknown[] {
  const rawEvents = matchFacts?.events;
  if (Array.isArray(rawEvents)) return rawEvents;
  if (isRecord(rawEvents) && Array.isArray(rawEvents.events)) return rawEvents.events;
  return [];
}

function transformEvents(content: JsonRecord | undefined): MatchEvent[] {
  const matchFacts = content ? getRecord(content, "matchFacts") : undefined;

  return getEventsArray(matchFacts).flatMap((event, index): MatchEvent[] => {
    if (!isRecord(event)) return [];

    const type = mapEventType(event.type, event.ownGoal);
    if (!type) return [];

    const player = getRecord(event, "player");
    const assist = getRecord(event, "assistInput") ?? getRecord(event, "assistPlayer");
    const card = normalizeKey(event.type).includes("red") ? "red" : "yellow";

    return [
      {
        id: getString(event.eventId, getString(event.reactKey, `${index}`)),
        type,
        minute: getNumber(event.time ?? event.timeStr),
        minuteExtra: event.overloadTime ? getNumber(event.overloadTime) : undefined,
        playerId: getNumber(event.playerId ?? player?.id),
        playerName: getString(event.nameStr, getString(event.fullName, getString(player?.name, "Unknown Player"))),
        assistPlayerId: assist ? getNumber(assist.id) : undefined,
        assistPlayerName: assist ? getString(assist.name) : undefined,
        cardType: type === "card" ? card : undefined,
      },
    ];
  });
}

function buildTeam(
  general: JsonRecord,
  header: JsonRecord | undefined,
  fallbackName: string,
  fallbackShortName: string,
) {
  return {
    id: getNumber(general.id ?? header?.id),
    name: getString(general.name, getString(header?.name, fallbackName)),
    shortName: getString(general.shortName, getString(header?.shortName, getString(header?.name, fallbackShortName))),
    score: getNumber(header?.score),
    formation: getString(general.formation, undefined),
  };
}

function transformMatchDetail(rawData: JsonRecord, matchId: string): MatchDetailData {
  const general = getRecord(rawData, "general") ?? {};
  const header = getRecord(rawData, "header") ?? {};
  const content = getRecord(rawData, "content");
  const status = getRecord(header, "status") ?? {};
  const teams = Array.isArray(header.teams) ? header.teams : [];
  const headerHome = isRecord(teams[0]) ? teams[0] : undefined;
  const headerAway = isRecord(teams[1]) ? teams[1] : undefined;
  const generalHome = getRecord(general, "homeTeam") ?? {};
  const generalAway = getRecord(general, "awayTeam") ?? {};
  const venue = getRecord(general, "venue");
  const referee = getRecord(general, "referee");
  const started = getBoolean(status.started, getBoolean(general.started));
  const finished = getBoolean(status.finished, getBoolean(general.finished));
  const cancelled = getBoolean(status.cancelled);

  return {
    id: getNumber(general.matchId, parseInt(matchId, 10)),
    home: buildTeam(generalHome, headerHome, "Home Team", "HOME"),
    away: buildTeam(generalAway, headerAway, "Away Team", "AWAY"),
    status: {
      utcTime: getString(status.utcTime, getString(general.matchTimeUTC, new Date().toISOString())),
      started,
      cancelled,
      finished,
      ongoing: getBoolean(status.ongoing, started && !finished && !cancelled),
      postponed: getBoolean(status.postponed),
      abandoned: getBoolean(status.abandoned),
      liveTime: isRecord(status.liveTime)
        ? {
            short: getString(status.liveTime.short),
            long: getString(status.liveTime.long),
            maxTime: getNumber(status.liveTime.maxTime),
          }
        : null,
      reason: isRecord(status.reason)
        ? {
            short: getString(status.reason.short),
            long: getString(status.reason.long),
          }
        : null,
    },
    tournament: {
      id: getNumber(general.leagueId),
      name: getString(general.leagueName, "Tournament"),
      leagueId: getNumber(general.parentLeagueId, getNumber(general.leagueId)),
      round: getString(general.leagueRoundName, undefined),
      season: getString(general.season, undefined),
    },
    venue: venue
      ? {
          id: getNumber(venue.id),
          name: getString(venue.name),
          city: getString(venue.city),
          country: isRecord(venue.country) ? getString(venue.country.name) : getString(venue.country),
          capacity: venue.capacity === undefined ? undefined : getNumber(venue.capacity),
        }
      : undefined,
    referee: referee
      ? {
          id: getNumber(referee.id),
          name: getString(referee.name),
          country: getString(referee.country, undefined),
        }
      : undefined,
    events: transformEvents(content),
    stats: transformStats(content),
    attendance: general.attendance === undefined ? undefined : getNumber(general.attendance),
  };
}

export function useMatchDetail(matchId: string) {
  const { data, error, isLoading } = useCachedPromise(
    async (matchId: string): Promise<MatchDetailData> => {
      const rawData = await fetchFotmobPageProps(buildMatchDetailUrl(matchId));
      return transformMatchDetail(rawData, matchId);
    },
    [matchId],
    {
      initialData: undefined,
    },
  );

  return { data, error, isLoading };
}
