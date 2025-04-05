import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { Cache, getPreferenceValues, showToast, Toast } from "@raycast/api";
import {
  Match,
  Matchday,
  SquadGroup,
  SerieAFixtureAndResult,
  SerieAMatchday,
  SerieASquad,
  SerieATable,
  SerieATeams,
  Standing,
  Team,
  Player,
  SerieAPlayer,
  Club,
} from "../types";
import { Championship, CoppaRounds, Round } from "../types/coppa";

const { language } = getPreferenceValues();
const cache = new Cache();

function showFailureToast() {
  showToast(
    Toast.Style.Failure,
    "Something went wrong",
    "Please try again later",
  );
}

const endpoint = "https://www.legaseriea.it/api";

export const getMatchday = async (season: string): Promise<Matchday[]> => {
  const [title, season_id] = season.split("_");
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/season/${season_id}/championship/A/matchday?lang=${language}`,
  };

  try {
    const { data }: AxiosResponse<SerieAMatchday> = await axios(config);

    return data.data;
  } catch (e) {
    showFailureToast();

    return [];
  }
};

export const getTeams = async (season: string): Promise<Team[]> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/widget/all-teams`,
    params: {
      lang: "en",
      id_category: "150060",
    },
  };

  try {
    const { data }: AxiosResponse<SerieATeams> = await axios(config);

    return data.data.body;
  } catch (e) {
    showFailureToast();

    return [];
  }
};

export const getStandings = async (season: string): Promise<Standing[]> => {
  const [title, season_id] = season.split("_");

  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/stats/live/Classificacompleta?CAMPIONATO=A&STAGIONE=${title}&TURNO=UNICO&GIRONE=UNI`,
  };

  try {
    const { data }: AxiosResponse<SerieATable> = await axios(config);

    const squadCodes = data.data.reduce(
      (out: { [key: string]: string }, cur) => {
        out[cur.Nome] = cur.CODSQUADRA;
        return out;
      },
      {},
    );

    cache.set(season, JSON.stringify(squadCodes));

    return data.data;
  } catch (e) {
    showFailureToast();

    return [];
  }
};

export const getMatches = async (
  season: string,
  params: object,
): Promise<Match[]> => {
  const [title, season_id] = season.split("_");

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
    const { data }: AxiosResponse<SerieAFixtureAndResult> = await axios(config);

    return data.data;
  } catch (e) {
    showFailureToast();

    return [];
  }
};

export const getSquad = async (
  team_name: string,
  season: string,
): Promise<SquadGroup | undefined> => {
  try {
    const [title, seasonId] = season.split("_");

    const hasCache = cache.has(team_name);
    if (!hasCache) {
      await getStandings(title);
    }

    const squadCodes = cache.get(title);
    if (!squadCodes) return undefined;

    const teamCode = JSON.parse(squadCodes)[team_name];
    const config: AxiosRequestConfig = {
      method: "GET",
      url: `${endpoint}/team/${teamCode}/players`,
    };

    const { data }: AxiosResponse<SerieASquad> = await axios(config);

    return data.data;
  } catch (e) {
    showFailureToast();

    return undefined;
  }
};

export const getPlayer = async (
  player_id: string,
): Promise<Player | undefined> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `${endpoint}/stats/Rosasquadra?CAMPIONATO=*&STAGIONE=*&CODGIOCATORE=${player_id}`,
  };

  try {
    const { data }: AxiosResponse<SerieAPlayer> = await axios(config);

    return data.data.reverse()[0];
  } catch (e) {
    showFailureToast();

    return undefined;
  }
};

export const getClub = async (slug: string): Promise<Club | undefined> => {
  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://www.legaseriea.it/_next/data/0pQSbyByFdxlm81lnGxQP/en/team/${slug}/club.json?slug=team&slug=${slug}&slug=club`,
  };

  try {
    const { data } = await axios(config);

    return data?.pageProps?.page?.context;
  } catch (e) {
    showFailureToast();

    return undefined;
  }
};

export const getCoppaRounds = async (season: string): Promise<Round[]> => {
  const [title, seasonId] = season.split("_");

  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://www.legaseriea.it/api/season/${seasonId}/championship/CPITA/rounds?lang=en`,
  };

  try {
    const { data }: AxiosResponse<CoppaRounds> = await axios(config);

    return data.data;
  } catch (e) {
    showFailureToast();

    return [];
  }
};

export const getChampionships = async (
  season: string,
): Promise<Championship[]> => {
  const [title, seasonId] = season.split("_");

  const config: AxiosRequestConfig = {
    method: "GET",
    url: `https://www.legaseriea.it/api/widget/international-championships?season_id=${seasonId}`,
  };

  try {
    const { data } = await axios(config);

    return data.data?.body || [];
  } catch (e) {
    showFailureToast();

    return [];
  }
};
