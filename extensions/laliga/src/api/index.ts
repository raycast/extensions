import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { showToast, Toast } from "@raycast/api";
import { LaLigaStanding, Standing } from "../types/standing";
import { LaLigaMatch, Match } from "../types/match";
import { LaLigaClub } from "../types/club";

function showFailureToast() {
  showToast(
    Toast.Style.Failure,
    "Something went wrong",
    "Please try again later"
  );
}

export const getCurrentGameWeek = async (competition: string) => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://apim.laliga.com/public-service/api/v1/subscriptions/${competition}/current-gameweek`,
    headers: {
      "Ocp-Apim-Subscription-Key": "c13c3a8e2f6b46da9c5c425cf61fab3e",
    },
  };

  try {
    const { data } = await axios(config);

    return data.gameweek;
  } catch (e) {
    showFailureToast();

    return {};
  }
};

export const getTeam = async (team: string) => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://apim.laliga.com/public-service/api/v1/teams/${team}`,
    headers: {
      "Ocp-Apim-Subscription-Key": "c13c3a8e2f6b46da9c5c425cf61fab3e",
    },
  };

  try {
    const { data }: AxiosResponse<LaLigaClub> = await axios(config);

    return data.team;
  } catch (e) {
    showFailureToast();

    return undefined;
  }
};

export const getStandings = async (
  competition: string
): Promise<Standing[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://apim.laliga.com/webview/api/web/subscriptions/${competition}/standing`,
    headers: {
      "Ocp-Apim-Subscription-Key": "ee7fcd5c543f4485ba2a48856fc7ece9",
    },
  };

  try {
    const { data }: AxiosResponse<LaLigaStanding> = await axios(config);

    return data.standings;
  } catch (e) {
    showFailureToast();

    return [];
  }
};

export const getMatches = async (
  competition: string,
  matchday: number
): Promise<Match[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://apim.laliga.com/webview/api/web/subscriptions/${competition}/week/${matchday}/matches`,
    headers: {
      "Ocp-Apim-Subscription-Key": "ee7fcd5c543f4485ba2a48856fc7ece9",
    },
  };

  try {
    const { data }: AxiosResponse<LaLigaMatch> = await axios(config);

    return data.matches;
  } catch (e) {
    showFailureToast();

    return [];
  }
};
