import { deploymentStatus } from "../api/Site";
import { locate } from "../lib/coordinates";
import { flatten, relatedId } from "../lib/forge";
import { rememberSites } from "../lib/index-cache";
import { asCursorList, asCursors, queryString, walkOrgs } from "../lib/listing";
import { ISite } from "../types";
import { askedFor, siteRowExtras } from "./fields";

type Input = {
  /**
   * Part of a site name. Forge matches on contains, so "6-8" finds 6-8.example.com.
   * It cannot see aliases.
   */
  name?: string;
  /**
   * A server id from list-servers, to list only that server's sites.
   */
  serverId?: number;
  /**
   * Extra field names to add to every row, comma separated. Call probe-api for the names.
   */
  fields?: string;
  /**
   * Only with serverId. A leading minus reverses it.
   */
  sort?: "name" | "-name" | "created_at" | "-created_at" | "updated_at" | "-updated_at";
  /**
   * How many sites per organization. Up to 30. Defaults to 15.
   */
  limit?: number;
  /**
   * The cursor from a previous call. Pass it back exactly as given for the next page.
   */
  cursor?: string;
};

export default async function tool({ name, serverId, fields, sort, limit, cursor }: Input) {
  const at = serverId === undefined ? undefined : await locate("server", serverId);
  // Forge omits a relationship nobody included, and a site is unreachable without its server
  const extra = at ? [] : ["include=server"];
  if (serverId !== undefined && sort?.trim()) extra.push(`sort=${encodeURIComponent(sort.trim())}`);
  const search = queryString({ name }, extra, limit);

  const { rows, next } = await walkOrgs(
    (ref) => (at ? `orgs/${ref.org}/servers/${serverId}/sites` : `orgs/${ref.org}/sites`),
    search,
    asCursors(cursor),
    at ? [{ account: at.account, org: at.org }] : undefined,
  );

  const asked = askedFor("site", fields);
  const sites = rows.map(({ ref, item }) => {
    const flat = flatten<ISite>(item);
    const host = serverId ?? relatedId(item, "server");
    return {
      row: {
        id: flat.id,
        name: flat.name,
        serverId: host,
        status: flat.status,
        deploymentStatus: deploymentStatus(flat.deployment_status),
        ...asked.from(siteRowExtras(flat)),
      },
      remember: [flat.id, { tokenKey: ref.account.tokenKey, org: ref.org, serverId: host }] as const,
    };
  });

  const located = sites.filter(({ remember }) => remember[1].serverId);
  await rememberSites(located.map(({ remember }) => [remember[0], remember[1]]));
  const stranded = sites.length - located.length;

  const notes = [`${sites.length} site${sites.length === 1 ? "" : "s"} on this page.`];
  // Handing back an id no site tool can reach is worse than saying so
  if (stranded) notes.push(`${stranded} of them name no server, so the site tools cannot reach those ids.`);
  if (next) notes.push("More to come: pass cursor back exactly as given for the next page.");
  if (name && !sites.length) notes.push(`No site name contains "${name}". Forge cannot match an alias.`);
  if (!asked.requested) notes.push("Rows are short. Call probe-api for the field names, then pass them in fields.");
  if (sort && serverId === undefined) notes.push("Forge only sorts a server's sites. Pass serverId to sort.");
  notes.push(...asked.notes);
  notes.push("Pass an id to get-site for the full record, or to any site tool.");

  return { note: notes.join(" "), ...(next ? { cursor: asCursorList(next) } : {}), sites: sites.map(({ row }) => row) };
}
