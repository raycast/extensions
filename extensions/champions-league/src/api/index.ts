import {
  Lineups,
  Match,
  MatchEvent,
  MatchStatus,
  Pagination,
  Player,
  PlayerRanking,
  PlayerSeasonRecord,
  Round,
  Season,
  Squad,
  Standing,
  Team,
  TeamMatchStats,
  TeamRanking,
} from "../types";

/** UEFA's competition id for the Champions League (European Cup before 1992). */
export const UCL = "1";

const COMP = "https://comp.uefa.com";
const MATCH = "https://match.uefa.com";
const STANDINGS = "https://standings.uefa.com";
const COMPSTATS = "https://compstats.uefa.com";
// Stats requests use phase=TOURNAMENT so qualifying rounds don't leak into leaderboards,
// matching the official uefa.com stats pages.
const MATCHSTATS = "https://matchstats.uefa.com";

type Params = Record<string, string | number | boolean | undefined>;

async function get<T>(
  base: string,
  path: string,
  params: Params = {},
): Promise<T> {
  const url = new URL(path, base);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`UEFA API responded ${res.status} for ${url.pathname}`);
  }

  return (await res.json()) as T;
}

/* -------------------------------------------------------------------------- */
/*                                   Seasons                                  */
/* -------------------------------------------------------------------------- */

export const getSeasons = async (): Promise<Season[]> => {
  const seasons = await get<Season[]>(COMP, `/v2/competitions/${UCL}/seasons`);

  return seasons
    .filter((s) => s.status !== "FUTURE")
    .sort((a, b) => Number(b.seasonYear) - Number(a.seasonYear));
};

export const getCurrentSeasonYear = async (): Promise<string> => {
  const seasons = await getSeasons();
  return seasons[0]?.seasonYear ?? String(new Date().getFullYear());
};

export const getRounds = async (seasonYear: string): Promise<Round[]> => {
  const rounds = await get<Round[]>(COMP, "/v2/rounds", {
    competitionId: UCL,
    seasonYear,
  });

  return rounds.sort((a, b) => a.orderInCompetition - b.orderInCompetition);
};

/* -------------------------------------------------------------------------- */
/*                                  Standings                                 */
/* -------------------------------------------------------------------------- */

export const getStandings = async (seasonYear: string): Promise<Standing[]> => {
  return get<Standing[]>(STANDINGS, "/v1/standings", {
    competitionId: UCL,
    seasonYear,
  });
};

/* -------------------------------------------------------------------------- */
/*                                   Matches                                  */
/* -------------------------------------------------------------------------- */

export interface MatchQuery {
  seasonYear?: string;
  status?: MatchStatus | MatchStatus[];
  order?: "ASC" | "DESC";
  teamId?: string;
  roundId?: string;
  phase?: "PREQUALIFYING" | "QUALIFYING" | "TOURNAMENT" | "ALL";
  fromDate?: string;
  toDate?: string;
}

export const getMatches = async (
  query: MatchQuery,
  page = 0,
  limit = 40,
): Promise<Pagination<Match>> => {
  const { status, ...rest } = query;
  const data = await get<Match[]>(MATCH, "/v5/matches", {
    competitionId: UCL,
    ...rest,
    status: Array.isArray(status) ? status.join(",") : status,
    offset: page * limit,
    limit,
  });

  return { data, hasMore: data.length === limit };
};

export const getAllMatches = async (query: MatchQuery): Promise<Match[]> => {
  const all: Match[] = [];
  for (let page = 0; page < 10; page += 1) {
    const { data, hasMore } = await getMatches(query, page, 100);
    all.push(...data);
    if (!hasMore) break;
  }
  return all;
};

export const getMatch = async (matchId: string): Promise<Match> => {
  return get<Match>(MATCH, `/v5/matches/${matchId}`);
};

export const getMatchLineups = async (matchId: string): Promise<Lineups> => {
  return get<Lineups>(MATCH, `/v5/matches/${matchId}/lineups`);
};

export const getMatchEvents = async (
  matchId: string,
): Promise<MatchEvent[]> => {
  return get<MatchEvent[]>(MATCH, `/v5/matches/${matchId}/events`, {
    filter: "MAIN",
    order: "DESC",
    offset: 0,
    limit: 200,
  });
};

export const getMatchTeamStats = async (
  matchId: string,
): Promise<TeamMatchStats[]> => {
  return get<TeamMatchStats[]>(MATCHSTATS, `/v1/team-statistics/${matchId}`);
};

/** Every European Cup / Champions League final, newest first. */
export const getFinals = async (): Promise<Match[]> => {
  const rounds = await get<Round[]>(COMP, "/v2/rounds", {
    competitionId: UCL,
    mode: "FINAL",
  });

  const roundId = rounds
    .filter((r) => r.metaData.type === "FINAL")
    .map((r) => r.id)
    .join(",");

  const finals = await getAllMatches({ roundId, order: "DESC" });

  return finals.filter((m) => m.status === "FINISHED");
};

/* -------------------------------------------------------------------------- */
/*                                Teams & squads                              */
/* -------------------------------------------------------------------------- */

export const getTeams = async (seasonYear: string): Promise<Team[]> => {
  const teams = await get<Team[]>(COMP, "/v2/teams", {
    competitionId: UCL,
    seasonYear,
    phase: "TOURNAMENT",
    offset: 0,
    limit: 100,
  });

  return teams
    .filter((t) => !t.isPlaceHolder)
    .sort((a, b) => a.internationalName.localeCompare(b.internationalName));
};

export const getTeam = async (teamId: string): Promise<Team | undefined> => {
  const teams = await get<Team[]>(COMP, "/v2/teams", { teamIds: teamId });
  return teams[0];
};

export const getSquad = async (
  seasonYear: string,
  teamId: string,
): Promise<Squad> => {
  return get<Squad>(
    COMP,
    `/v2/competitions/${UCL}/seasons/${seasonYear}/teams/${teamId}/squad`,
  );
};

/* -------------------------------------------------------------------------- */
/*                                   Players                                  */
/* -------------------------------------------------------------------------- */

/** All players registered for the main tournament of a season (≈1,300). */
export const getRegisteredPlayers = async (
  seasonYear: string,
): Promise<Player[]> => {
  const limit = 500;
  const players: Player[] = [];

  for (let offset = 0; offset < 5000; offset += limit) {
    const page = await get<Player[]>(COMP, "/v2/players", {
      competitionId: UCL,
      seasonYear,
      phase: "TOURNAMENT",
      offset,
      limit,
    });
    players.push(...page);
    if (page.length < limit) break;
  }

  return players;
};

export const getPlayer = async (
  playerId: string,
): Promise<Player | undefined> => {
  const players = await get<Player[]>(COMP, "/v2/players", {
    playerIds: playerId,
  });
  return players[0];
};

export const PLAYER_SEASON_STATS = [
  "matches_appearance",
  "minutes_played_official",
  "goals",
  "assists",
  "attempts",
  "attempts_on_target",
  "passes_completed",
  "passes_accuracy",
  "distance_covered",
  "top_speed",
  "tackles",
  "saves",
  "clean_sheet",
  "yellow_cards",
  "red_cards",
];

export const getPlayerSeasonStats = async (
  seasonYear: string,
  playerId: string,
): Promise<PlayerRanking | undefined> => {
  const stats = await get<PlayerRanking[]>(COMPSTATS, "/v1/player-statistics", {
    competitionId: UCL,
    phase: "TOURNAMENT",
    seasonYear,
    playerId,
    stats: PLAYER_SEASON_STATS.join(","),
  });
  return stats[0];
};

/** Per-season Champions League record for a player, newest season first. */
export const getPlayerCareer = async (
  playerId: string,
): Promise<PlayerSeasonRecord[]> => {
  const data = await get<{
    competitionSeasonStatistics?: PlayerSeasonRecord[];
  }>(COMPSTATS, "/v1/player-statistics/all-time", {
    competitionIds: UCL,
    playerId,
    stats: "matches_appearance,goals,assists,minutes_played_official",
  });

  return (data.competitionSeasonStatistics ?? []).sort(
    (a, b) => Number(b.seasonYear) - Number(a.seasonYear),
  );
};

/* -------------------------------------------------------------------------- */
/*                                 Leaderboards                               */
/* -------------------------------------------------------------------------- */

export const getPlayerRanking = async (
  seasonYear: string,
  stat: string,
  limit = 50,
): Promise<PlayerRanking[]> => {
  return get<PlayerRanking[]>(COMPSTATS, "/v1/player-ranking", {
    competitionId: UCL,
    phase: "TOURNAMENT",
    seasonYear,
    stats: stat,
    order: "DESC",
    optionalFields: "PLAYER,TEAM",
    offset: 0,
    limit,
  });
};

export const getTeamRanking = async (
  seasonYear: string,
  stat: string,
): Promise<TeamRanking[]> => {
  return get<TeamRanking[]>(COMPSTATS, "/v1/team-ranking", {
    competitionId: UCL,
    phase: "TOURNAMENT",
    seasonYear,
    stats: stat,
    order: "DESC",
    optionalFields: "TEAM",
    offset: 0,
    limit: 40,
  });
};

export const TEAM_SEASON_STATS = [
  "matches_appearance",
  "matches_win",
  "matches_draw",
  "matches_loss",
  "goals",
  "goals_conceded",
  "attempts",
  "ball_possession",
  "passes_accuracy",
  "clean_sheet",
  "yellow_cards",
  "red_cards",
];

export const getTeamSeasonStats = async (
  seasonYear: string,
  teamId: string,
): Promise<TeamRanking | undefined> => {
  const stats = await get<TeamRanking[]>(COMPSTATS, "/v1/team-statistics", {
    competitionId: UCL,
    phase: "TOURNAMENT",
    seasonYear,
    teamId,
    stats: TEAM_SEASON_STATS.join(","),
  });
  return stats[0];
};
