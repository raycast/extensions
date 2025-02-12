import { Cache, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import * as cheerio from "cheerio";
import {
  Broadcast,
  Broadcasts,
  ClubPerson,
  CompetitionClub,
  Player,
  Players,
} from "../types";
import {
  Entry,
  LiveBlogEntries,
  Matchday,
  SeasonConfig,
} from "../types/firebase";

const { apikey } = getPreferenceValues();
const cache = new Cache();

const headers = {
  "x-api-key": apikey,
};

function load(html: string, keyContains: string) {
  const $ = cheerio.load(html);
  const state = $("#serverApp-state").html();

  let data;
  if (state) {
    try {
      data = JSON.parse(state.replace(/&q;/g, '"').replace(/&s;/g, "'"));
    } catch (e) {
      showFailureToast(e);
      data = {};
    }
  }

  const keys = Object.keys(data).filter((k) => k.includes(keyContains));

  return keys.length ? data[keys[keys.length - 1]] : {};
}

// const cfgKey = "bundesliga_config";
const getSeason = async (): Promise<SeasonConfig | undefined> => {
  try {
    // const has = cache.has(cfgKey);

    // let data;
    // if (has) {
    //   data = cache.get(cfgKey);
    // } else {
    const resp = await axios({
      method: "get",
      url: "https://wapp.bapi.bundesliga.com/config/configNode.json",
    });

    const data = resp.data;
    cache.set(
      "bundesliga_config",
      typeof data === "string" ? data : JSON.stringify(resp.data),
    );
    // }

    const cfg: { [com: string]: SeasonConfig } =
      typeof data === "string" ? JSON.parse(data) : data;

    return Object.values(cfg)[0];
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getClubs = async (): Promise<CompetitionClub> => {
  const season = await getSeason();

  const config: AxiosRequestConfig = {
    method: "get",
    url: "https://wapp.bapi.bundesliga.com/club",
    params: {
      // sort: "editorialorder",
      seasonId: season?.season.dflDatalibrarySeasonId,
    },
    headers,
  };

  try {
    const { data }: AxiosResponse<CompetitionClub> = await axios(config);

    return data;
  } catch (e) {
    showFailureToast(e);

    return {};
  }
};

export const getPersons = async (club: string): Promise<Players> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `https://wapp.bapi.bundesliga.com/person/personsbyclub/${club}`,
    headers,
  };

  try {
    const { data }: AxiosResponse<ClubPerson> = await axios(config);

    return data.players;
  } catch (e) {
    showFailureToast(e);

    return {};
  }
};

export const getPerson = async (slug: string): Promise<Player | undefined> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `https://wapp.bapi.bundesliga.com/person/personbyslug/${slug}`,
    headers,
  };

  try {
    const { data }: AxiosResponse<Player> = await axios(config);

    return data;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getTable = async (competition: string): Promise<Entry[]> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `https://www.bundesliga.com/en/${competition}/table`,
  };

  try {
    const resp = await axios(config);
    const data = load(resp.data, "liveTable");

    return data.entries || [];
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getFixtures = async (
  competition: string,
  matchday?: number,
): Promise<Matchday[]> => {
  const season = await getSeason();

  const url = matchday
    ? `https://www.bundesliga.com/en/${competition}/matchday/${season?.season.name}/${matchday}`
    : `https://www.bundesliga.com/en/${competition}/matchday`;

  const config: AxiosRequestConfig = {
    method: "get",
    url,
  };

  try {
    const resp = await axios(config);
    const data = load(resp.data, "matchesmatchday");

    return data || [];
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};

export const getMatch = async (
  url: string,
): Promise<LiveBlogEntries | undefined> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url,
  };

  try {
    const resp = await axios(config);
    const data: Matchday = load(resp.data, "matchdays");

    return data.liveBlogEntries;
  } catch (e) {
    showFailureToast(e);

    return undefined;
  }
};

export const getBroadcasters = async (
  competition: string,
  season: string,
  matchday: string,
): Promise<Broadcast[]> => {
  const config: AxiosRequestConfig = {
    method: "get",
    url: `https://wapp.bapi.bundesliga.com/broadcasts/${competition}/${matchday}`,
    headers,
  };

  try {
    const { data }: AxiosResponse<Broadcasts> = await axios(config);

    return data.broadcasts;
  } catch (e) {
    showFailureToast(e);

    return [];
  }
};
