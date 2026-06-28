import { showFailureToast } from "@raycast/utils";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import sortBy from "lodash.sortby";
import {
  ClubIdentity,
  L1GameWeeks,
  L1Matches,
  L1Standings,
  Match,
  Standing,
} from "../types";

export const getClubs = async (str: string): Promise<ClubIdentity[]> => {
  const [season, competition] = str.split("_");
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://ma-api.ligue1.fr/championship-standings/${competition}/general`,
    params: { season },
  };

  try {
    const { data }: AxiosResponse<L1Standings> = await axios(config);

    const clubs = Object.values(data.standings).map((s) => s.clubIdentity);
    return sortBy(clubs, "name");
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getTable = async (str: string): Promise<Standing[]> => {
  const [season, competition] = str.split("_");
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://ma-api.ligue1.fr/championship-standings/${competition}/general`,
    params: { season },
  };

  try {
    const { data }: AxiosResponse<L1Standings> = await axios(config);

    return Object.values(data.standings);
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getMatches = async (
  str: string,
  gameweek?: number,
): Promise<Match[]> => {
  const [season, competition] = str.split("_");

  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://ma-api.ligue1.fr/championship-matches/championship/${competition}/game-week/${gameweek}`,
    params: {
      season,
    },
  };

  try {
    const { data }: AxiosResponse<L1Matches> = await axios(config);

    return data.matches;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getGameWeeks = async (str: string): Promise<number> => {
  const [, competition] = str.split("_");
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://ma-api.ligue1.fr/championship-calendar/${competition}/nearest-game-weeks`,
  };

  try {
    const { data }: AxiosResponse<L1GameWeeks> = await axios(config);

    return data.nearestGameWeeks.currentGameWeek.gameWeekNumber;
  } catch (e) {
    showFailureToast(e);

    return 1;
  }
};
