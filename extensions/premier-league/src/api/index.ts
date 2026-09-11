import { showFailureToast } from "@raycast/utils";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import {
  Club,
  Content,
  EPLAward,
  EPLCompetition,
  EPLContentReport,
  EPLMatchEvents,
  EPLMatchLineups,
  EPLMatchOfficials,
  EPLMetadata,
  EPLPagination,
  EPLPlayerSearch,
  EPLPlayerStats,
  EPLStandings,
  EPLTeamSquad,
  Fixture,
  Hit,
  MatchCommentary,
  Metadata,
  Player,
  Season,
  Table,
  TeamForm,
} from "../types";
import { competitions } from "../components/searchbar_competition";
import { subHours } from "date-fns";
import { getCompetitionTimestamp, isFinished } from "../utils";

const epl = competitions[0].value;

const endpoint = "https://sdp-prem-prod.premier-league-prod.pulselive.com/api";

const LIVE_WINDOW_HOURS = 3;

interface Pagination<T> {
  data: T[];
  hasMore: boolean;
  cursor?: string | null;
}

const SEASON_START_MONTH = 6;

const expectedSeasonId = (): string => {
  const now = new Date();

  return String(
    now.getMonth() >= SEASON_START_MONTH
      ? now.getFullYear()
      : now.getFullYear() - 1,
  );
};

const buildSeason = (seasonId: string): Season => ({
  seasonId,
  label: `${seasonId}/${String((Number(seasonId) + 1) % 100).padStart(2, "0")}`,
  annotations: [],
  qualification: [],
  relegation: [],
});

export const getActiveSeason = async (
  comp: string = "8",
): Promise<string | undefined> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/v2/matches`,
    params: {
      competition: comp,
      _sort: "kickoff:desc",
      _limit: 1,
    },
  };

  try {
    const { data }: AxiosResponse<EPLPagination<Fixture>> = await axios(config);

    return data.data[0]?.season;
  } catch {
    return undefined;
  }
};

export const getSeasons = async (comp: string = "8"): Promise<Season[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://resources.premierleague.com/premierleague25/config/season-config/competitions/${comp}.json`,
  };

  try {
    const { data }: AxiosResponse<EPLCompetition> = await axios(config);
    const { seasons } = data;

    if (seasons.some((s) => s.seasonId === expectedSeasonId())) {
      return seasons;
    }

    const activeSeasonId = await getActiveSeason(comp);

    if (!activeSeasonId || seasons.some((s) => s.seasonId === activeSeasonId)) {
      return seasons;
    }

    if (!seasons.length) {
      return [buildSeason(activeSeasonId)];
    }

    const newest = seasons.reduce(
      (max, s) => Math.max(max, Number(s.seasonId)),
      0,
    );

    const missing: Season[] = [];
    for (let year = newest + 1; year <= Number(activeSeasonId); year += 1) {
      missing.push(buildSeason(String(year)));
    }

    return [...missing, ...seasons].sort(
      (a, b) => Number(b.seasonId) - Number(a.seasonId),
    );
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getMatchweek = async (): Promise<number> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: "https://resources.premierleague.com/premierleague25/config/current-gameweek.json",
  };

  try {
    const { data } = await axios(config);

    return data.matchweek;
  } catch (e) {
    showFailureToast(e);

    return 0;
  }
};

export const getLatestPlayedMatchweek = async (
  season: string,
  comp: string = "8",
): Promise<number | undefined> => {
  const now = getCompetitionTimestamp(new Date());

  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v2/matches`,
    params: {
      competition: comp,
      season,
      _sort: "kickoff:desc",
      _limit: 20,
      [`kickoff<${now}`]: "",
    },
  };

  try {
    const { data }: AxiosResponse<EPLPagination<Fixture>> = await axios(config);

    return data.data.find(isFinished)?.matchWeek;
  } catch {
    return undefined;
  }
};

export const getUpcomingMatchweek = async (
  season: string,
  comp: string = "8",
): Promise<number | undefined> => {
  const from = getCompetitionTimestamp(subHours(new Date(), LIVE_WINDOW_HOURS));

  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v2/matches`,
    params: {
      competition: comp,
      season,
      _sort: "kickoff:asc",
      _limit: 20,
      [`kickoff>${from}`]: "",
    },
  };

  try {
    const { data }: AxiosResponse<EPLPagination<Fixture>> = await axios(config);
    const match = data.data.find((m) => !isFinished(m)) ?? data.data[0];

    return match?.matchWeek;
  } catch {
    return undefined;
  }
};

export const getAwards = async (season: string) => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/v1/competitions/${epl}/seasons/${season}/awards`,
  };

  try {
    const { data }: AxiosResponse<EPLAward> = await axios(config);

    return data;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getClubs = async (season: string): Promise<Club[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/v1/competitions/${epl}/seasons/${season}/teams`,
    params: {
      _limit: 60,
    },
  };

  try {
    const { data }: AxiosResponse<EPLPagination<Club>> = await axios(config);

    return data.data;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getClubMetadata = async (
  clubId: string,
): Promise<Metadata | undefined> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/v1/metadata/SDP_FOOTBALL_TEAM/${clubId}`,
  };

  try {
    const { data }: AxiosResponse<EPLMetadata> = await axios(config);

    return data.metadata;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getTeamForm = async (season: string): Promise<TeamForm[]> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v1/competitions/${epl}/seasons/${season}/teamform`,
  };

  try {
    const { data }: AxiosResponse<TeamForm[]> = await axios(config);

    return data;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getTeamSquad = async (
  season: string,
  teamId: string,
): Promise<EPLTeamSquad | undefined> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v2/competitions/${epl}/seasons/${season}/teams/${teamId}/squad`,
  };

  try {
    const { data }: AxiosResponse<EPLTeamSquad> = await axios(config);

    return data;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getTables = async (season: string): Promise<Table[]> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v5/competitions/${epl}/seasons/${season}/standings`,
  };

  try {
    const { data }: AxiosResponse<EPLStandings> = await axios(config);

    const teamform = await getTeamForm(season);

    if (teamform) {
      data.tables.forEach((table) => {
        table.entries.forEach((entry) => {
          const form = teamform.find((tf) => tf.id === entry.team.id);
          if (form) {
            Object.assign(entry, form);
          }
        });
      });
    }

    return data.tables;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getMatches = async (
  props: Record<string, string | number>,
): Promise<Pagination<Fixture>> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v2/matches`,
    params: {
      _sort: "kickoff:asc",
      ...props,
    },
  };

  try {
    const { data }: AxiosResponse<EPLPagination<Fixture>> = await axios(config);
    const hasMore = data.pagination._next ? true : false;

    return { data: data.data, hasMore, cursor: data.pagination._next };
  } catch (e) {
    showFailureToast(e);

    return { data: [], hasMore: false, cursor: null };
  }
};

export const getMatch = async (
  matchId: string,
): Promise<Fixture | undefined> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v2/matches/${matchId}`,
  };

  try {
    const { data }: AxiosResponse<Fixture> = await axios(config);

    return data;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getMatchEvents = async (
  matchId: string,
): Promise<EPLMatchEvents | undefined> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v1/matches/${matchId}/events`,
  };

  try {
    const { data }: AxiosResponse<EPLMatchEvents> = await axios(config);

    return data;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getMatchOfficials = async (
  matchId: string,
): Promise<EPLMatchOfficials | undefined> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v1/matches/${matchId}/officials`,
  };

  try {
    const { data }: AxiosResponse<EPLMatchOfficials> = await axios(config);

    return data;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getMatchLineups = async (
  matchId: string,
): Promise<EPLMatchLineups | undefined> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v3/matches/${matchId}/lineups`,
  };

  try {
    const { data }: AxiosResponse<EPLMatchLineups> = await axios(config);

    return data;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getMatchReports = async (
  matchId: string,
): Promise<Content | undefined> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: "https://api.premierleague.com/content/premierleague/TEXT/en",
    params: {
      references: `SDP_FOOTBALL_MATCH:${matchId}`,
      tagNames: "Match Report",
      detail: "DETAILED",
    },
  };

  try {
    const { data }: AxiosResponse<EPLContentReport> = await axios(config);

    return data.content?.[0];
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getMatchCommentary = async (
  matchId: string,
  _next: string | null = null,
): Promise<Pagination<MatchCommentary>> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v1/matches/${matchId}/commentary`,
    params: {
      _limit: 40,
      _sort: "timestamp:desc",
      _next,
    },
  };

  try {
    const { data }: AxiosResponse<EPLPagination<MatchCommentary>> =
      await axios(config);
    const hasMore = data.pagination._next ? true : false;

    return { data: data.data, hasMore, cursor: data.pagination._next };
  } catch (e) {
    showFailureToast(e);

    return { data: [], hasMore: false, cursor: null };
  }
};

export const getPlayers = async (props: {
  season: string;
  competition: string;
  teams?: string;
  _next?: string;
}): Promise<Pagination<Player>> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v1/players`,
    params: {
      ...props,
    },
  };

  try {
    const { data }: AxiosResponse<EPLPagination<Player>> = await axios(config);
    const hasMore = data.pagination._next ? true : false;

    return { data: data.data, hasMore, cursor: data.pagination._next };
  } catch (e) {
    showFailureToast(e);

    return { data: [], hasMore: false, cursor: null };
  }
};

export const getPlayerInformation = async (
  season: string,
  playerId: string,
): Promise<Player | undefined> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/v1/competitions/${epl}/seasons/${season}/playerinfo/${playerId}`,
  };

  try {
    const { data }: AxiosResponse<Player> = await axios(config);

    return data;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getPlayerStats = async (
  season: string,
  playerId: string,
): Promise<EPLPlayerStats | undefined> => {
  const config: AxiosRequestConfig = {
    method: "get",
    // url: `${endpoint}/v1/competitions/${competition}/players/${playerId}/stats`, // seems use for overall stats
    url: `${endpoint}/v2/competitions/${epl}/seasons/${season}/players/${playerId}/stats`,
  };

  try {
    const { data }: AxiosResponse<EPLPlayerStats> = await axios(config);

    return data;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getPlayersWithTerms = async (
  terms: string,
): Promise<Pagination<Hit>> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: "https://api.premierleague.com/search/v2/premierleague",
    params: {
      fullObjectResponse: true,
      fields: "first_name,last_name",
      lang: "en",
      size: 20,
      type: "SDP_FOOTBALL_PLAYER",
      terms,
    },
  };

  try {
    const { data }: AxiosResponse<EPLPlayerSearch> = await axios(config);

    return { data: data.hits, hasMore: false };
  } catch (e) {
    showFailureToast(e);

    return { data: [], hasMore: false };
  }
};
