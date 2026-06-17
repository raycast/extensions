import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import {
  Gameweek,
  Match,
  MatchCommentary,
  MatchLineup,
  MatchPreviousNext,
  Round,
  Squad,
  Standing,
  Team,
} from "../types";

const { apikey } = getPreferenceValues();

const endpoint = "https://apim.laliga.com/public-service/api/v1";
const headers = {
  "Ocp-Apim-Subscription-Key": apikey,
  "Content-Language": "en",
};

const limit = 50;

export const getCurrentGameWeek = async (competition: string): Promise<Gameweek | undefined> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/subscriptions/${competition}/current-gameweek`,
    headers,
  };

  try {
    const { data } = await axios(config);

    return data.gameweek;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getTeams = async (season: string): Promise<Team[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/teams`,
    params: {
      subscriptionSlug: season,
      limit,
      offset: 0,
      orderField: "nickname",
      orderType: "ASC",
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<Record<"teams", Team[]>> = await axios(config);

    return data.teams;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getTeam = async (team: string) => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/teams/${team}`,
    headers,
  };

  try {
    const { data }: AxiosResponse<Record<"team", Team>> = await axios(config);

    return data.team;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getStandings = async (competition: string): Promise<Standing[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/subscriptions/${competition}/standing`,
    headers,
  };

  try {
    const { data }: AxiosResponse<Record<"standings", Standing[]>> = await axios(config);

    return data.standings;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getMatches = async (subscriptionSlug: string, week: number): Promise<Match[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/matches`,
    params: {
      subscriptionSlug,
      week,
      limit,
      orderField: "date",
      orderType: "asc",
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<Record<"matches", Match[]>> = await axios(config);

    return data.matches;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getPrevNextMatches = async (
  team: string,
  subscriptionSlug: string,
): Promise<MatchPreviousNext | undefined> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/matches/${team}/nextpreviousmatches`,
    params: {
      subscriptionSlug,
      previousLimit: 5,
      nextLimit: 1,
      previousOrderField: "date",
      previousOrderType: "desc",
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<Record<"match_previous_next", MatchPreviousNext>> = await axios(config);

    return data.match_previous_next;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getSquad = async (team: string): Promise<Squad[]> => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/teams/${team}/squad-manager`,
    params: {
      limit,
      offset: 0,
      orderField: "id",
      orderType: "DESC",
      seasonYear: month < 6 ? year - 1 : year,
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<Record<"squads", Squad[]>> = await axios(config);

    return data.squads;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getSubscriptionRounds = async (competition: string): Promise<Round[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/subscriptions/${competition}/rounds`,
    headers,
  };

  try {
    const { data }: AxiosResponse<Record<"rounds", Round[]>> = await axios(config);

    return data.rounds;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getMatchComments = async (slug: string, page: number) => {
  const offset = page * limit;

  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/matches/${slug}/comments`,
    headers,
    params: {
      limit,
      offset,
    },
  };

  try {
    const { data }: AxiosResponse<{ total: number; match_commentaries: MatchCommentary[] }> = await axios(config);

    return {
      data: data.match_commentaries,
      hasMore: offset + data.match_commentaries.length < data.total,
    };
  } catch (e) {
    showFailureToast(e);

    return { data: [], hasMore: false };
  }
};

export const getMatchLineups = async (slug: string): Promise<MatchLineup[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/matches/${slug}/lineups`,
    headers,
  };

  try {
    const {
      data,
    }: AxiosResponse<{
      [key in "home_team_lineups" | "away_team_lineups"]: MatchLineup[];
    }> = await axios(config);

    return data.home_team_lineups.concat(data.away_team_lineups);
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};
