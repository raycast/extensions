import { open } from "@raycast/api";

import { baseUrl } from "./constants";
import { TParams } from "./types";

export const createChallenge = (params: TParams): Promise<void> =>
  openWithParams({ ...params, action: "createLiveChallenge" });

export const openWithParams = (params: TParams): Promise<void> => open(buildUrl(baseUrl, params));

const buildUrl = (baseUrl: string, params: TParams): string => {
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return `${baseUrl}?${query}`;
};
