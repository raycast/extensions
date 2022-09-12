import { showToast, Toast } from "@raycast/api";
import axios, { AxiosRequestConfig } from "axios";

const endpoint = "https://proud-hen-sunbonnet.cyclic.app/fpl_api/";
const headers = {
  authority: "users.premierleague.com",
  "cache-control": "max-age=0",
  "upgrade-insecure-requests": "1",
  origin: "https://fantasy.premierleague.com/",
  "content-type": "application/x-www-form-urlencoded",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
  "sec-fetch-site": "same-site",
  "sec-fetch-mode": "navigate",
  "sec-fetch-user": "?1",
  "sec-fetch-dest": "document",
  referer: "https://fantasy.premierleague.com/",
  "accept-language": "en-US,en;q=0.9,he;q=0.8",
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
