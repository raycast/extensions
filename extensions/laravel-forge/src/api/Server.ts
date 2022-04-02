import { showToast, popToRoot, Toast, getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";
import { IServer } from "../Server";
import { sortBy } from "lodash";
import { FORGE_API_URL } from "../config";
import { mapKeys, camelCase } from "lodash";
import { SitesResponse } from "./Site";
import { ISite } from "../Site";

function theHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
}

export const Server = {
  async getAll() {
    const preferences = getPreferenceValues();
    // Because we have support for two accounts, pass the key through
    let servers = await getServers(preferences?.laravel_forge_api_key as string);

    if (preferences?.laravel_forge_api_key_two) {
      const serversTwo = await getServers(preferences?.laravel_forge_api_key_two as string);
      servers = servers.concat(serversTwo);
    }
    return sortBy(servers, (s) => s?.name?.toLowerCase()) ?? {};
  },

  async reboot({
    serverId,
    token,
    key = "",
    label = "server",
  }: {
    serverId?: number | string;
    token?: string;
    key?: string;
    label?: string;
  }) {
    if (!serverId || !token) {
      showToast(Toast.Style.Failure, "Server ID and token are required");
      return;
    }
    const headers = theHeaders(token);
    const endpoint = key ? `servers/${serverId}/${key}/reboot` : `servers/${serverId}/reboot`;
    try {
      await fetch(`${FORGE_API_URL}/${endpoint}`, {
        method: "post",
        headers,
      });
      showToast(Toast.Style.Success, `Rebooting ${label}...`);
    } catch (error) {
      console.error(error);
      showToast(Toast.Style.Failure, `Failed to reboot ${label}`);
      return;
    }
  },
};

const getServers = async (token: string) => {
  const headers = theHeaders(token);
  try {
    const response = await fetch(`${FORGE_API_URL}/servers`, {
      method: "get",
      headers,
    });
    if (response.status === 401) {
      throw new Error("Error authenticating with Forge");
    }
    // Get site data which will by searchable along with servers
    const sitesResponse = await fetch(`${FORGE_API_URL}/sites`, {
      method: "get",
      headers,
    });
    const sitesData = (await sitesResponse.json()) as SitesResponse;
    let sites = sitesData?.sites ?? [];
    sites = sites?.map((s) => mapKeys(s, (_, k) => camelCase(k)) as ISite);
    const keywordsByServer = getSiteKeywords(sites);

    // Get the server data
    const serverData = (await response.json()) as ServersResponse;
    let servers = serverData?.servers ?? [];
    servers = servers.map((s) => mapKeys(s, (_, k) => camelCase(k)) as IServer);
    return servers
      .map((server) => {
        server.keywords = server?.id ? [...keywordsByServer[server.id]] : [];
        server.apiToken = token;
        return server;
      })
      .filter((s) => !s.revoked);
  } catch (error) {
    console.error(error);
    await popToRoot();
    if (error instanceof Error) {
      showToast(Toast.Style.Failure, error?.message);
      return [];
    }
    showToast(Toast.Style.Failure, "Api request failed");
    return [];
  }
};

const getSiteKeywords = (sites: ISite[]) => {
  return sites?.reduce((acc, site): Record<number, Set<string>> => {
    if (!site?.serverId) return acc;
    const keywords = [site?.name ?? "", ...(site?.aliases ?? [])];
    if (!acc[site.serverId]) {
      acc[site.serverId] = new Set<string>();
    }
    keywords.forEach((keyword) => site?.serverId && acc[site.serverId].add(keyword));
    return acc;
  }, <Record<number, Set<string>>>{});
};

type ServersResponse = {
  servers?: IServer[];
};
