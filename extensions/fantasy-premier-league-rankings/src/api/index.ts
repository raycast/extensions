import { showToast, Toast } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";

const endpoint = "https://hwbraycastfpl.azurewebsites.net/";
const headers = {
  "user-agent": "Dalvik/2.1.0 (Linux; U; Android 6.0; Android SDK built for x86_64 Build/MASTER)",
};

const showErrorToast = (error: any) => {
  console.log(error);
  showToast(Toast.Style.Failure, "We are having issues connecting to the FPL API", "Please try again later");
};

export const getUser = async (id: string) => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}entry/${id}/`,
    headers,
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
    headers,
  };

  try {
    const { data } = await axios(config);

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
    headers,
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
    headers,
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
    headers,
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
    headers,
  };

  try {
    const { data } = await axios(config);

    return data;
  } catch (error) {
    showErrorToast(error);
    return [];
  }
};
