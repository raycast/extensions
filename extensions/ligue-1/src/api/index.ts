import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { showToast, Toast } from "@raycast/api";
import {
  ClubIdentity,
  L1GameWeeks,
  L1Matches,
  L1Standings,
  Match,
  Standing,
} from "../types";
import sortBy from "lodash.sortby";

function showFailureToast() {
  showToast(
    Toast.Style.Failure,
    "Something went wrong",
    "Please try again later",
  );
}

export const getClubs = async (season: string): Promise<ClubIdentity[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: "https://ma-api.ligue1.fr/championship-standings/1/general",
    params: { season },
  };

  try {
    const { data }: AxiosResponse<L1Standings> = await axios(config);

    const clubs = Object.values(data.standings).map((s) => s.clubIdentity);
    return sortBy(clubs, "name");
  } catch (e) {
    showFailureToast();

    return [];
  }
};

export const getTable = async (season: string): Promise<Standing[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: "https://ma-api.ligue1.fr/championship-standings/1/general",
    params: {
      season,
    },
  };

  try {
    const { data }: AxiosResponse<L1Standings> = await axios(config);

    return Object.values(data.standings);
  } catch (e) {
    showFailureToast();

    return [];
  }
};

export const getMatches = async (
  season: string,
  gameweek?: number,
): Promise<Match[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://ma-api.ligue1.fr/championship-matches/championship/1/game-week/${gameweek}`,
    params: {
      season,
    },
  };

  try {
    const { data }: AxiosResponse<L1Matches> = await axios(config);

    return data.matches;
  } catch (e) {
    showFailureToast();

    return [];
  }
};

export const getGameWeeks = async (): Promise<number> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: "https://ma-api.ligue1.fr/championship-calendar/1/nearest-game-weeks",
  };

  try {
    const { data }: AxiosResponse<L1GameWeeks> = await axios(config);

    return data.nearestGameWeeks.currentGameWeek.gameWeekNumber;
  } catch (e) {
    showFailureToast();

    return 1;
  }
};
