import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import {
  Club,
  DataV3,
  Match,
  Matchday,
  SerieA,
  SquadGroup,
  Standing,
  Team,
} from "../types";
import { Championship, CoppaRounds, Round } from "../types/coppa";

const { apikey, language } = getPreferenceValues();

const endpoint = "https://www.legaseriea.it/api";

export const getMatchday = async (season: string): Promise<Matchday[]> => {
  const [, season_id] = season.split("_");
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/season/${season_id}/championship/A/matchday?lang=${language}`,
  };

  try {
    const { data }: AxiosResponse<SerieA<Matchday[]>> = await axios(config);

    return data.data;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getStandings = async (season: string): Promise<Standing[]> => {
  const [title] = season.split("_");

  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/stats/Classificacompleta?CAMPIONATO=A&STAGIONE=${title}&TURNO=UNICO&GIRONE=UNI`,
  };

  try {
    const { data }: AxiosResponse<SerieA<Standing[]>> = await axios(config);

    return data.data;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getStandingsV3 = async (season: string): Promise<Standing[]> => {
  const [, , season_id] = season.split("_");

  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/stats/v3/live/overall?season_id=serie-a::Football_Season::${season_id}`,
  };

  try {
    const { data }: AxiosResponse<SerieA<DataV3>> = await axios(config);

    return data.data.standings[0].teams;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getMatches = async (
  season: string,
  params: object,
): Promise<Match[]> => {
  const [, season_id] = season.split("_");

  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/stats/live/match`,
    params: {
      extra_link: "",
      order: "oldest",
      lang: "en",
      season_id,
      ...params,
    },
  };

  try {
    const { data }: AxiosResponse<SerieA<Match[]>> = await axios(config);

    return data.data;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getSquad = async (
  teamCode: string,
): Promise<SquadGroup | undefined> => {
  try {
    const config: AxiosRequestConfig = {
      method: "GET",
      url: `${endpoint}/team/${teamCode.toString()}/players`,
    };

    const { data }: AxiosResponse<SerieA<SquadGroup>> = await axios(config);

    return data.data;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getTeams = async (): Promise<Team[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://www.legaseriea.it/_next/data/${apikey}/en/serie-a/squadre.json?slug=serie-a&slug=squadre`,
  };

  try {
    const { data } = await axios(config);

    const body = data?.pageProps?.page?.body;
    if (Array.isArray(body)) {
      const teams = body.find((o) => o.name === "NavbarTeam");

      return teams ? teams.body : [];
    }

    return [];
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getClub = async (slug: string): Promise<Club | undefined> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://www.legaseriea.it/_next/data/${apikey}/en/team/${slug}/club.json?slug=team&slug=${slug}&slug=club`,
  };

  try {
    const { data } = await axios(config);

    return data?.pageProps?.page?.context;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getCoppaRounds = async (season: string): Promise<Round[]> => {
  const [, seasonId] = season.split("_");

  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://www.legaseriea.it/api/season/${seasonId}/championship/CPITA/rounds?lang=en`,
  };

  try {
    const { data }: AxiosResponse<CoppaRounds> = await axios(config);

    return data.data;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getChampionships = async (
  season: string,
): Promise<Championship[]> => {
  const [, seasonId] = season.split("_");

  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://www.legaseriea.it/api/widget/international-championships?season_id=${seasonId}`,
  };

  try {
    const { data } = await axios(config);

    return data.data?.body || [];
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};
