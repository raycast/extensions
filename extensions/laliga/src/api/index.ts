import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  LaLigaClub,
  LaLigaClubs,
  LaLigaClubSquad,
  LaLigaMatch,
  LaLigaMatchCommentaries,
  LaLigaStanding,
  LaLigaSubscriptionRounds,
  Match,
  MatchCommentary,
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

export const getCurrentGameWeek = async (competition: string) => {
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

    return {};
  }
};

export const getTeams = async (season: string): Promise<Team[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/teams`,
    params: {
      subscriptionSlug: season,
      limit: 99,
      offset: 0,
      orderField: "nickname",
      orderType: "ASC",
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<LaLigaClubs> = await axios(config);

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
    const { data }: AxiosResponse<LaLigaClub> = await axios(config);

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
    const { data }: AxiosResponse<LaLigaStanding> = await axios(config);

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
      limit: 100,
      orderField: "date",
      orderType: "asc",
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<LaLigaMatch> = await axios(config);

    return data.matches;
  } catch (e) {
    showFailureToast(e);

    return [];
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
      limit: 50,
      offset: 0,
      orderField: "id",
      orderType: "DESC",
      seasonYear: month < 6 ? year - 1 : year,
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<LaLigaClubSquad> = await axios(config);

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
    const { data }: AxiosResponse<LaLigaSubscriptionRounds> = await axios(config);

    return data.rounds;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getMatchComments = async (slug: string): Promise<MatchCommentary[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/matches/${slug}/comments`,
    headers,
    params: {
      limit: 100,
    },
  };

  try {
    const { data }: AxiosResponse<LaLigaMatchCommentaries> = await axios(config);

    return data.match_commentaries;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};
