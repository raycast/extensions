import useSWR from "swr";
import type { SWRConfiguration } from "swr";
import { IServer, ISite } from "../types";
import { Site } from "../api/Site";
import { isStatus } from "../lib/api";
import { unwrapToken } from "../lib/auth";
import { LocalStorage } from "@raycast/api";
import { USE_FAKE_DATA } from "../config";
import { MockSite } from "../api/Mock";
import { forgetServers } from "./useServers";

type key = [IServer["id"], IServer["api_token_key"], IServer["org_slug"]];

const fetcher = async ([serverId, tokenKey, orgSlug]: key) => {
  if (USE_FAKE_DATA) return MockSite.getAll(serverId);
  const cacheKey = `sites-v2-${serverId}`;
  Site.getAll({
    orgSlug,
    serverId,
    token: unwrapToken(tokenKey),
  })
    .then(({ sites, archived }) => {
      if (archived) forgetServers();
      return LocalStorage.setItem(cacheKey, JSON.stringify(sites));
    })
    .catch((error) => {
      // Archiving flags the server; transferring or deleting it just leaves the org
      if (isStatus(error, 404)) forgetServers();
      return LocalStorage.removeItem(cacheKey);
    });

  return await backupData(cacheKey);
};

export const useSites = (server?: IServer, optons: Partial<SWRConfiguration> = {}) => {
  const { data, error } = useSWR<ISite[]>(
    server?.id ? [server.id, server.api_token_key, server.org_slug] : null,
    fetcher,
    optons,
  );

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
