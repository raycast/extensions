import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
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

function showFailureToast() {
  showToast(Toast.Style.Failure, "Something went wrong", "Please try again later");
}

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
    showFailureToast();

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
    showFailureToast();

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
    showFailureToast();

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
    showFailureToast();

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
    showFailureToast();

    return [];
  }
};

export const getSquad = async (team: string): Promise<Squad[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/teams/${team}/squad-manager`,
    params: {
      limit: 50,
      offset: 0,
      orderField: "id",
      orderType: "DESC",
      // seasonYear: "2021",
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<LaLigaClubSquad> = await axios(config);

    return data.squads;
  } catch (e) {
    showFailureToast();

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
    showFailureToast();

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
    showFailureToast();

    return [];
  }
};
