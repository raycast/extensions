import { Cache } from "@raycast/api";

export enum CacheKey {
  QUIT_APP = "Quit App",
  REFRESH_INTERVAL = "Refresh Interval",
}

export const defaultCache = new Cache();
