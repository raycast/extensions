import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import differenceInDays from "date-fns/differenceInDays";

import { getPreferenceValues, environment, Grid } from "@raycast/api";

export const API_KEY = "apiKey";
export const MAX_RESULTS = "maxResults";
export const DEFAULT_ACTION = "defaultAction";
export const LAYOUT = "layoutType";
export const GRID_ITEM_SIZE = "gridItemSize";

export const CONFIG_URL = "https://cdn.joe.sh/gif-search/config.json";

export type ServiceName = "giphy" | "tenor" | "finergifs" | "favorites" | "recents";
export const GIF_SERVICE: { [name: string]: ServiceName } = {
  GIPHY: "giphy",
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
      return "Giphy";
    case GIF_SERVICE.TENOR:
      return "Tenor";
    case GIF_SERVICE.FINER_GIFS:
      return "Finer Gifs Club";
  }

  return "";
}

export type Preference = { [preferenceName: string]: any };

let prefs: Preference;

export function getPrefs() {
  if (!prefs) {
    prefs = getPreferenceValues<Preference>();
  }

  return prefs;
}

export async function getAPIKey(serviceName: ServiceName, forceRefresh?: boolean) {
  let apiKey = getPrefs()[`${serviceName}-${API_KEY}`];
  if (!apiKey) {
    const config = await fetchConfig(forceRefresh);
    apiKey = config.apiKeys[serviceName];
  }

  return apiKey;
}

export function getDefaultAction(): string {
  return getPrefs()[DEFAULT_ACTION];
}

export function getMaxResults(): number {
  return parseInt(getPrefs()[MAX_RESULTS], 10) ?? 10;
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

export type LayoutType = "list" | "grid";
export const LAYOUT_TYPE: { [type: string]: LayoutType } = {
  List: "list",
  Grid: "grid",
};

export function getLayoutType() {
  return getPrefs()[LAYOUT];
}

export const GRID_SIZE: { [key: string]: Grid.ItemSize } = {
  small: Grid.ItemSize.Small,
  medium: Grid.ItemSize.Medium,
  large: Grid.ItemSize.Large,
};

export function getGridItemSize() {
  return GRID_SIZE[getPrefs()[GRID_ITEM_SIZE]];
}
