import { showToast, ToastStyle, popToRoot } from "@raycast/api";
import { preferences } from "@raycast/api";
import fetch from "node-fetch";
import { IServer } from "../Server";
import { sortBy } from "lodash";
import { FORGE_API_URL } from "../config";
import { mapKeys, camelCase } from "lodash";

function theHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };
}

export const Server = {
  async getAll() {
    // Because we have support for two accounts, pass the key through
    let servers = await getServers(preferences?.laravel_forge_api_key?.value as string);

    if (preferences?.laravel_forge_api_key_two?.value) {
      const serversTwo = await getServers(preferences?.laravel_forge_api_key_two?.value as string);
      servers = servers.concat(serversTwo);
    }
    return sortBy(servers, (s) => s.name.toLowerCase()) ?? {};
  },

  async reboot({
    serverId,
    token,
    key = "",
    label = "server",
  }: {
    serverId: number | string;
    token: string;
    key?: string;
    label?: string;
  }) {
    const headers = theHeaders(token);
    const endpoint = key ? `servers/${serverId}/${key}/reboot` : `servers/${serverId}/reboot`;
    try {
      await fetch(`${FORGE_API_URL}/${endpoint}`, {
        method: "post",
        headers,
      });
      showToast(ToastStyle.Success, `Rebooting ${label}...`);
    } catch (error) {
      console.error(error);
      showToast(ToastStyle.Failure, `Failed to reboot ${label}`);
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
    const serverData = (await response.json()) as ServersResponse;
    let servers = serverData?.servers ?? [];
    // eslint-disable-next-line
    // @ts-expect-error Not sure how to convert Dictionary from lodash to IServer
    servers = servers.map((s) => mapKeys(s, (_, k) => camelCase(k)) as IServer);
    return servers
      .map((server) => {
        server.apiToken = token;
        return server;
      })
      .filter((s) => !s.revoked);
  } catch (error) {
    console.error(error);
    await popToRoot();
    if (error instanceof Error) {
      showToast(ToastStyle.Failure, error?.message);
      return [];
    }
    showToast(ToastStyle.Failure, "Api request failed");
    return [];
  }
};

type ServersResponse = {
  servers: IServer[];
};
