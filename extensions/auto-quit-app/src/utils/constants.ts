import { Cache } from "@raycast/api";

export enum CacheKey {
  QUIT_APP = "Quit App",
  LAST_BACKGROUND_REFRESH_TIME = "Last Background Refresh Time",
}

export const defaultCache = new Cache();
