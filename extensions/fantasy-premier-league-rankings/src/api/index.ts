import { showToast, Toast } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";

const endpoint = "https://fantasy.premierleague.com/api/";

const showErrorToast = (error: unknown) => {
  console.log(error);
  showToast(Toast.Style.Failure, "We are having issues connecting to the FPL API", "Please try again later");
};

export const getUser = async (id: string) => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}entry/${id}/`,
  };

  try {
    const { data } = await axios(config);

    return data;
  } catch (error) {
    showErrorToast(error);
    return [];
  }
};

export const getUserLeagues = async (id: string) => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}entry/${id}/`,
  };

  try {
    const { data } = await axios(config);
    /* eslint-disable @typescript-eslint/no-explicit-any */
    return data.leagues.classic.filter((league: any) => league.league_type === "x");
  } catch (error) {
    showErrorToast(error);
    return [];
  }
};

export const getLeague = async (id: string) => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}leagues-classic/${id}/standings/`,
  };

  try {
    const { data } = await axios(config);

    return data;
  } catch (error) {
    showErrorToast(error);
    return [];
  }
};

export const getUserTeamByGameweek = async (id: string, gameweek: number | undefined) => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}entry/${id}/event/${gameweek}/picks/`,
  };

  try {
    const { data } = await axios(config);

    return data;
  } catch (error) {
    showErrorToast(error);
    return [];
  }
};

export const getAllPlayers = async () => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}bootstrap-static/`,
  };

  try {
    const { data } = await axios(config);

    return data.elements;
  } catch (error) {
    showErrorToast(error);
    return [];
  }
};

export const getBootstrapStatic = async () => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}bootstrap-static/`,
  };

  try {
    const { data } = await axios(config);

    return data;
  } catch (error) {
    showErrorToast(error);
    return [];
  }
};
