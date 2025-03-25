import useSWR from "swr";
import type { SWRConfiguration } from "swr";
import { IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";
import { LocalStorage } from "@raycast/api";
import { USE_FAKE_DATA } from "../config";
import { MockSite } from "../api/Mock";

type key = [IServer["id"], IServer["api_token_key"]];

const fetcher = async ([serverId, tokenKey]: key) => {
  if (USE_FAKE_DATA) return MockSite.getAll(serverId);
  const cacheKey = `sites-${serverId}`;
  Site.getAll({
    serverId,
    token: unwrapToken(tokenKey),
  })
    .then((data) => LocalStorage.setItem(cacheKey, JSON.stringify(data)))
    .catch(() => LocalStorage.removeItem(cacheKey));

  return await backupData(cacheKey);
};

export const useSites = (server?: IServer, optons: Partial<SWRConfiguration> = {}) => {
  const { data, error } = useSWR<ISite[]>(server?.id ? [server.id, server.api_token_key] : null, fetcher, optons);

  return {
    sites: data,
    loading: !error && !data,
    error: error,
  };
};

const backupData = async (cacheKey: string) => {
  const data = await LocalStorage.getItem(cacheKey);
  if (typeof data === "string") return JSON.parse(data);
  return data;
};
