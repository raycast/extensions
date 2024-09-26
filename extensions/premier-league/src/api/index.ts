import { showFailureToast } from "@raycast/utils";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import {
  Content,
  EPLClub,
  EPLFixture,
  EPLPlayer,
  EPLPlayerSearch,
  EPLStaff,
  EPLStanding,
  PlayerContent,
  Table,
  TeamTeam,
} from "../types";

const endpoint = "https://footballapi.pulselive.com/football";
const headers = {
  Origin: "https://www.premierleague.com",
};

const pageSize = 50;

interface PlayerResult {
  data: PlayerContent[];
  hasMore: boolean;
}

export const getSeasons = async (
  comps: string = "1",
): Promise<{ label: string; id: number }[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/competitions/${comps}/compseasons`,
    params: {
      page: 0,
      pageSize: 100,
    },
    headers,
  };

  try {
    const { data } = await axios(config);

    return data.content;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getClubs = async (compSeasons: string): Promise<TeamTeam[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/teams`,
    params: {
      page: 0,
      pageSize: 100,
      comps: 1,
      altIds: true,
      compSeasons,
    },
    headers: {
      ...headers,
      account: "premierleague",
    },
  };

  try {
    const { data }: AxiosResponse<EPLClub> = await axios(config);

    return data.content;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getTeams = async (
  season: string,
): Promise<{ title: string; value: string }[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/compseasons/${season}/teams`,
    headers,
  };

  try {
    const { data }: AxiosResponse<TeamTeam[]> = await axios(config);

    const teams = data.map((team) => ({
      title: team.name,
      value: team.id.toString(),
    }));

    teams.unshift({
      title: "All Clubs",
      value: "-1",
    });

    return teams;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getTables = async (seasonId: string): Promise<Table[]> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/standings`,
    params: {
      compSeasons: seasonId,
      altIds: true,
      detail: 2,
      FOOTBALL_COMPETITION: 1,
      live: true,
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<EPLStanding> = await axios(config);

    return data.tables;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getFixtures = async (props: {
  teams?: string;
  page: number;
  sort: string;
  statuses: string;
  comps: string;
  compSeasons: string;
}): Promise<[Content[], boolean]> => {
  if (props.teams === "-1") {
    delete props.teams;
  }

  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/fixtures`,
    params: {
      pageSize: 40,
      altIds: true,
      ...props,
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<EPLFixture> = await axios(config);
    const hasMore = data.pageInfo.numPages > data.pageInfo.page + 1;

    return [data.content, hasMore];
  } catch (e) {
    showFailureToast(e);

    return [[], false];
  }
};

export const getPlayers = async (
  teams: string,
  season: string,
  page: number,
): Promise<PlayerResult> => {
  const params: { [key: string]: string | number | boolean } = {
    pageSize,
    compSeasons: season,
    altIds: true,
    page,
    type: "player",
    id: -1,
    compSeasonId: season,
  };

  if (teams !== "-1") {
    params.teams = teams;
  }

  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/players`,
    params,
    headers,
  };

  try {
    const { data }: AxiosResponse<EPLPlayer> = await axios(config);
    const hasMore = data.pageInfo.numPages > data.pageInfo.page + 1;

    return { data: data.content, hasMore };
  } catch (e) {
    showFailureToast(e);

    return { data: [], hasMore: false };
  }
};

export const getStaffs = async (
  team: string,
  season: string,
): Promise<PlayerResult> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/teams/${team}/compseasons/${season}/staff`,
    params: {
      pageSize: 100,
      // compSeasons: season,
      altIds: true,
      page: 0,
      type: "player",
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<EPLStaff> = await axios(config);

    return { data: data.players, hasMore: false };
  } catch (e) {
    showFailureToast(e);

    return { data: [], hasMore: false };
  }
};

export const getManagers = async (compSeasons: string) => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/teamofficials`,
    params: {
      pageSize: 100,
      compSeasons,
      compCodeForActivePlayer: "EN_PR",
      comps: 1,
      altIds: true,
      type: "manager",
      page: 0,
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<EPLPlayer> = await axios(config);

    return data.content;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getPlayersWithTerms = async (
  terms: string,
  page: number,
): Promise<PlayerResult> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `https://footballapi.pulselive.com/search/PremierLeague`,
    params: {
      terms: `${terms},${terms}*`,
      type: "player",
      size: pageSize,
      start: page * pageSize,
      fullObjectResponse: true,
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<EPLPlayerSearch> = await axios(config);
    const hasMore = data.hits.found !== data.hits.start + data.hits.hit.length;
    const players = data.hits.hit.map((h) => h.response).filter((p) => !!p);

    return { data: players, hasMore };
  } catch (e) {
    showFailureToast(e);

    return { data: [], hasMore: false };
  }
};
