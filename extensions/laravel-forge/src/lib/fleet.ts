import { sortAndFilterSites } from "../api/Site";
import { ISite } from "../types";
import { accountFor } from "./accounts";
import { flatten, relatedId } from "./forge";
import { rememberSites } from "./index-cache";
import { queryString, walkOrgs } from "./listing";
import { orgsFor } from "./orgs";

// Forge's own /sites route names no org, and a site's path needs one, so this
// walks the org-scoped route instead and banks what it learns
export const fleetSites = async (tokenKey: string): Promise<ISite[]> => {
  const account = accountFor(tokenKey);
  if (!account) return [];

  const refs = (await orgsFor(account)).map((org) => ({ account, org }));
  if (!refs.length) return [];

  const { rows } = await walkOrgs(
    (ref) => `orgs/${ref.org}/sites`,
    queryString({}, ["include=server"], 30),
    undefined,
    refs,
    {
      pages: 20,
    },
  );

  const found = rows.map(({ ref, item }) => ({ ref, site: flatten<ISite>(item), serverId: relatedId(item, "server") }));

  await rememberSites(
    found
      .filter(({ serverId }) => serverId)
      .map(({ ref, site, serverId }) => [site.id, { tokenKey, org: ref.org, serverId }]),
  );

  return sortAndFilterSites(found.map(({ site, serverId }) => ({ ...site, server_id: serverId ?? 0 })));
};
