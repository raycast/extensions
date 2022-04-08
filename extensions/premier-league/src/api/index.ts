import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { showToast, Toast } from "@raycast/api";
import {
  EPLStanding,
  EPLFixture,
  Content,
  Table,
  TeamTeam,
  EPLPlayer,
  EPLClub,
  EPLStaff,
  PlayerContent,
  EPLPlayerSearch,
} from "../types";

const endpoint = "https://footballapi.pulselive.com/football";
const headers = {
  Origin: "https://www.premierleague.com",
};

function showFailureToast() {
  showToast(
    Toast.Style.Failure,
    "Something went wrong",
    "Please try again later"
  );
}

export const getSeasons = async () => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/competitions/1/compseasons`,
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
    showFailureToast();

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
    headers,
  };

  try {
    const { data }: AxiosResponse<EPLClub> = await axios(config);

    return data.content;
  } catch (e) {
    showFailureToast();

    return [];
  }
};

export const getTeams = async (season: string) => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/compseasons/${season}/teams`,
    headers,
  };

  try {
    const { data }: AxiosResponse<TeamTeam[]> = await axios(config);

    return data;
  } catch (e) {
    showFailureToast();

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
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<EPLStanding> = await axios(config);

    return data.tables;
  } catch (e) {
    showFailureToast();

    return [];
  }
};

export const getFixtures = async (props: {
  teams?: string;
  page: number;
  sort: string;
  statuses: string;
}): Promise<[Content[], boolean]> => {
  if (props.teams === "-1") {
    delete props.teams;
  }

  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/fixtures`,
    params: {
      comps: 1,
      pageSize: 40,
      altIds: true,
      ...props,
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<EPLFixture> = await axios(config);
    const lastPage = data.pageInfo.page === data.pageInfo.numPages - 1;

    return [data.content, lastPage];
  } catch (e) {
    showFailureToast();

    return [[], false];
  }
};

export const getPlayers = async (
  teams: string,
  season: string,
  page: number
): Promise<PlayerContent[]> => {
  const params: { [key: string]: string | number | boolean } = {
    pageSize: 50,
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

    return data.content;
  } catch (e) {
    showFailureToast();

    return [];
  }
};

export const getStaffs = async (
  team: string,
  season: string
): Promise<PlayerContent[]> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `${endpoint}/teams/${team}/compseasons/${season}/staff`,
    params: {
      pageSize: 50,
      // compSeasons: season,
      altIds: true,
      page: 0,
      type: "player",
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<EPLStaff> = await axios(config);

    return data.players;
  } catch (e) {
    showFailureToast();

    return [];
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
    showFailureToast();

    return [];
  }
};

export const getPlayersWithTerms = async (terms: string) => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `https://footballapi.pulselive.com/search/PremierLeague`,
    params: {
      terms: `${terms},${terms}*`,
      type: "player",
      size: 30,
      start: 0,
      fullObjectResponse: true,
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<EPLPlayerSearch> = await axios(config);

    return data.hits.hit.map((h) => h.response).filter((p) => !!p);
  } catch (e) {
    showFailureToast();

    return [];
  }
};
