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

const epl = competitions[0].value;

const endpoint = "https://sdp-prem-prod.premier-league-prod.pulselive.com/api";

interface Pagination<T> {
  data: T[];
  hasMore: boolean;
  cursor?: string | null;
}

export const getSeasons = async (comp: string = "8"): Promise<Season[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://resources.premierleague.com/premierleague25/config/season-config/competitions/${comp}.json`,
  };

  try {
    const { data }: AxiosResponse<EPLCompetition> = await axios(config);

    return data.seasons;
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
      ...props,
      _sort: "kickoff:asc",
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
