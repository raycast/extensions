import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import differenceInDays from "date-fns/differenceInDays";

import { getPreferenceValues, environment } from "@raycast/api";

export const API_KEY = "apiKey";

export const CONFIG_URL = "https://cdn.joe.sh/gif-search/config.json";

export type ServiceName = "giphy" | "giphy-clips" | "tenor" | "finergifs" | "favorites" | "recents";
export const GIF_SERVICE: { [name: string]: ServiceName } = {
  GIPHY: "giphy",
  GIPHY_CLIPS: "giphy-clips",
  TENOR: "tenor",
  FINER_GIFS: "finergifs",
  FAVORITES: "favorites",
  RECENTS: "recents",
};

export function getServices() {
  return Object.values(GIF_SERVICE).filter((service) => {
    return service != GIF_SERVICE.FAVORITES && service != GIF_SERVICE.RECENTS;
  });
}

export function getServiceTitle(service?: ServiceName) {
  switch (service) {
    case GIF_SERVICE.GIPHY:
      return "Giphy GIFs";
    case GIF_SERVICE.GIPHY_CLIPS:
      return "Giphy Clips";
    case GIF_SERVICE.TENOR:
      return "Tenor";
    case GIF_SERVICE.FINER_GIFS:
      return "Finer Gifs Club";
  }

  return "";
}

const preferences = getPreferenceValues<Preferences>();

export async function getAPIKey(serviceName: ServiceName, forceRefresh?: boolean) {
  // giphy-clips is a special case, it uses the same API key as giphy
  const name = serviceName === "giphy-clips" ? "giphy" : serviceName;

  if (name !== "giphy" && name !== "tenor") {
    throw new Error("Only Giphy and Tenor require API keys");
  }

  let apiKey = preferences[`${name}-${API_KEY}`];
  if (!apiKey) {
    const config = await fetchConfig(forceRefresh);
    apiKey = config.apiKeys[name];
  }

  return apiKey;
}

export function getDefaultAction(): string {
  return preferences.defaultAction;
}

export function getMaxResults(): number {
  return parseInt(preferences.maxResults, 10) ?? 10;
}

export type Config = {
  apiKeys: {
    [service in ServiceName]: string;
  };
};

const configPath = path.resolve(environment.supportPath, "config.json");
export async function fetchConfig(forceRefresh?: boolean) {
  let config: Config;
  try {
    if (forceRefresh) {
      throw new Error("Forcibly fetching config from server");
    }

    config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Config;

    const { mtime } = fs.statSync(configPath);
    const diff = differenceInDays(new Date(), new Date(mtime));
    if (diff > 7) {
      // Re-download config if over a week old
      throw new Error(`Config out of date, ${diff} days old`);
    }
  } catch (e) {
    const response = await fetch(CONFIG_URL);
    config = (await response.json()) as Config;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
  }

  return config;
}

export const GRID_COLUMNS: { [key: string]: number } = {
  small: 8,
  medium: 5,
  large: 3,
};

export function getGridItemSize() {
  return preferences.gridItemSize;
}

export function getGridTrendingItemSize() {
  return preferences.gridTrendingItemSize;
}
