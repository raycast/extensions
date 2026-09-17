import { Account } from "../lib/accounts";
import { rememberMany } from "../lib/index-cache";
import { queryString, walkOrgs } from "../lib/listing";

export type ServerSite = { id: number; name: string };

// A truncated list understates what a reboot takes down, so this pages past Forge's 30
export const sitesOn = async ({
  account,
  org,
  serverId,
}: {
  account: Account;
  org: string;
  serverId: number;
}): Promise<ServerSite[]> => {
  const { rows } = await walkOrgs(
    () => `orgs/${org}/servers/${serverId}/sites`,
    queryString({}, [], 30),
    undefined,
    [{ account, org }],
    { pages: 20 },
  ).catch(() => ({ rows: [], next: undefined }));

  const sites = rows.map(({ item }) => ({ id: Number(item.id), name: String(item.attributes?.name ?? item.id) }));
  // Any id we hand back has to be reachable by the site tools we point at
  await rememberMany(
    "site",
    sites.map(({ id }) => [id, { tokenKey: account.tokenKey, org, serverId }]),
  );
  return sites;
};

export const siteNames = (sites: ServerSite[]) => sites.map(({ name }) => name);
