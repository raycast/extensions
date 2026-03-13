import { getPreferenceValues } from "@raycast/api";
import { sortBy } from "lodash";
import { FORGE_API_URL } from "../config";
import { IServer, ISite } from "../types";
import { apiFetch } from "../lib/api";
import { Site } from "./Site";

const defaultHeaders = {
  "Content-Type": "application/x-www-form-urlencoded",
  Accept: "application/json",
};

type DynamicReboot = {
  serverId: number;
  token: string;
  key?: string;
  label?: string;
};

export const Server = {
  async getAll() {
    const preferences = getPreferenceValues();
    // Because we have support for two accounts, pass the key through
    let servers = await getServers({
      tokenKey: "laravel_forge_api_key",
      token: preferences?.laravel_forge_api_key as string,
      sshUser: (preferences?.laravel_forge_ssh_user as string) || "forge",
    });

    if (preferences?.laravel_forge_api_key_two) {
      const serversTwo = await getServers({
        tokenKey: "laravel_forge_api_key_two",
        token: preferences?.laravel_forge_api_key_two as string,
        sshUser: (preferences?.laravel_forge_ssh_user_two as string) || "forge",
      });
      servers = [...servers, ...serversTwo];
    }
    return sortBy(servers, (s) => s?.name?.toLowerCase()) ?? {};
  },

  async reboot({ serverId, token, key = "" }: DynamicReboot) {
    const endpoint = key ? `servers/${serverId}/${key}/reboot` : `servers/${serverId}/reboot`;
    await apiFetch(`${FORGE_API_URL}/${endpoint}`, {
      method: "post",
      headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
    });
  },
};

const getServers = async ({ token, tokenKey, sshUser }: { token: string; tokenKey: string; sshUser: string }) => {
  const { servers } = await apiFetch<{ servers: IServer[] }>(`${FORGE_API_URL}/servers`, {
    method: "get",
    headers: { ...defaultHeaders, Authorization: `Bearer ${token}` },
  });

  // Get site data which will by searchable along with servers
  let keywordsByServer: Record<number, Set<string>> = {};
  try {
    const sites = await Site.getSitesWithoutServer({ token });
    keywordsByServer = getSiteKeywords(sites ?? []);
  } catch (error) {
    console.error(error);
    // fail gracefully here as it's not critical information
  }

  return servers
    .map((server) => {
      server.keywords = server?.id && keywordsByServer[server.id] ? [...keywordsByServer[server.id]] : [];
      server.api_token_key = tokenKey;
      server.ssh_user = sshUser;
      return server;
    })
    .filter((s) => !s.revoked);
};

const getSiteKeywords = (sites: ISite[]) => {
  return sites?.reduce((acc, site): Record<number, Set<string>> => {
    if (!site?.server_id) return acc;
    const keywords = [site?.name ?? "", ...(site?.aliases ?? [])];
    if (!acc[site.server_id]) {
      acc[site.server_id] = new Set<string>();
    }
    keywords.forEach((keyword) => site?.server_id && acc[site.server_id].add(keyword));
    return acc;
  }, <Record<number, Set<string>>>{});
};
