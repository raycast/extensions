import { getPreferenceValues } from "@raycast/api";
import { sortBy } from "lodash";
import { FORGE_API_URL } from "../config";
import { IServer } from "../types";
import { apiFetch, authHeaders, fetchAllPages } from "../lib/api";
import { ServerAttributes } from "../lib/jsonapi";
import { normalizeServer } from "./normalize";
import { Org } from "./Org";

type Account = { tokenKey: string; token: string; sshUser: string };

type DynamicReboot = {
  org: string;
  serverId: IServer["id"];
  token: string;
  key?: string;
};

export const Server = {
  async getAll(): Promise<IServer[]> {
    const preferences = getPreferenceValues();
    const accounts: Account[] = [
      {
        tokenKey: "laravel_forge_api_key",
        token: preferences?.laravel_forge_api_key as string,
        sshUser: (preferences?.laravel_forge_ssh_user as string) || "forge",
      },
    ];
    if (preferences?.laravel_forge_api_key_two) {
      accounts.push({
        tokenKey: "laravel_forge_api_key_two",
        token: preferences?.laravel_forge_api_key_two as string,
        sshUser: (preferences?.laravel_forge_ssh_user_two as string) || "forge",
      });
    }

    const servers = (await Promise.all(accounts.map(getServersForAccount))).flat();
    return sortBy(servers, (s) => s?.name?.toLowerCase());
  },

  async reboot({ org, serverId, token, key = "" }: DynamicReboot): Promise<void> {
    const endpoint = key
      ? `${FORGE_API_URL}/orgs/${org}/servers/${serverId}/services/${key}/actions`
      : `${FORGE_API_URL}/orgs/${org}/servers/${serverId}/actions`;
    await apiFetch(endpoint, {
      method: "post",
      headers: authHeaders(token),
      body: JSON.stringify({ action: "reboot" }),
    });
  },
};

const getServersForAccount = async ({ token, tokenKey, sshUser }: Account): Promise<IServer[]> => {
  if (!token) return [];
  const orgs = await Org.getAll({ token });

  const perOrg = await Promise.all(
    orgs.map(async (org) => {
      const resources = await fetchAllPages<ServerAttributes>(`${FORGE_API_URL}/orgs/${org.slug}/servers`, {
        method: "get",
        headers: authHeaders(token),
      });

      return resources
        .map((r) => normalizeServer(r, { org_slug: org.slug, api_token_key: tokenKey, ssh_user: sshUser }))
        .filter((s) => !s.revoked);
    })
  );

  return perOrg.flat();
};
