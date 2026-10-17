import { flatten } from "../lib/forge";
import { rememberMany } from "../lib/index-cache";
import { asCursorList, asCursors, queryString, walkOrgs } from "../lib/listing";
import { IServer } from "../types";
import { askedFor, serverRowExtras } from "./fields";

type Input = {
  /**
   * Part of a server name. Forge matches on contains.
   */
  name?: string;
  /**
   * A provider region to match exactly, like nyc3.
   */
  region?: string;
  /**
   * A provider to match exactly, like ocean2.
   */
  provider?: string;
  /**
   * A default PHP version to match exactly, like php83.
   */
  phpVersion?: string;
  /**
   * A database engine to match exactly, like mysql8.
   */
  databaseType?: string;
  /**
   * An Ubuntu release to match exactly, like 24.04.
   */
  ubuntuVersion?: string;
  /**
   * A provider size to match exactly, like s-2vcpu-2gb.
   */
  size?: string;
  /**
   * A public IP address to match exactly.
   */
  ipAddress?: string;
  /**
   * Which order Forge returns them in. A leading minus reverses it.
   */
  sort?:
    | "name"
    | "-name"
    | "provider"
    | "-provider"
    | "ubuntu_version"
    | "-ubuntu_version"
    | "region"
    | "-region"
    | "php_version"
    | "-php_version"
    | "created_at"
    | "-created_at"
    | "updated_at"
    | "-updated_at";
  /**
   * Extra field names to add to every row, comma separated. Call probe-api for the names.
   */
  fields?: string;
  /**
   * How many servers per organization. Up to 30. Defaults to 15.
   */
  limit?: number;
  /**
   * The cursor from a previous call. Pass it back exactly as given for the next page.
   */
  cursor?: string;
  /**
   * Set true to also return servers Forge has been disconnected from. Defaults to false.
   */
  includeRevoked?: boolean;
};

export default async function tool({ fields, sort, limit, cursor, includeRevoked, ...filters }: Input) {
  const search = queryString(
    {
      name: filters.name,
      region: filters.region,
      provider: filters.provider,
      php_version: filters.phpVersion,
      database_type: filters.databaseType,
      ubuntu_version: filters.ubuntuVersion,
      size: filters.size,
      ip_address: filters.ipAddress,
    },
    sort?.trim() ? [`sort=${encodeURIComponent(sort.trim())}`] : [],
    limit,
  );

  const { rows, next } = await walkOrgs((ref) => `orgs/${ref.org}/servers`, search, asCursors(cursor));

  const asked = askedFor("server", fields, { ensure: includeRevoked ? ["revoked"] : [] });
  const found = rows.map(({ ref, item }) => ({ ref, server: flatten<IServer>(item) }));
  const shown = found.filter(({ server }) => includeRevoked || !server.revoked);

  await rememberMany(
    "server",
    shown.map(({ ref, server }) => [server.id, { tokenKey: ref.account.tokenKey, org: ref.org }]),
  );

  const servers = shown.map(({ server }) => ({
    id: server.id,
    name: server.name,
    connectionStatus: server.connection_status,
    ...asked.from(serverRowExtras(server)),
  }));

  const hidden = found.length - shown.length;
  const notes = [`${servers.length} server${servers.length === 1 ? "" : "s"} on this page.`];
  if (hidden) notes.push(`${hidden} revoked and not shown. Pass includeRevoked to see them.`);
  if (next) notes.push("More to come: pass cursor back exactly as given for the next page.");
  if (!asked.requested) notes.push("Rows are short. Call probe-api for the field names, then pass them in fields.");
  notes.push(...asked.notes);
  notes.push("Pass an id to get-server for the full record, or to any server tool.");

  return { note: notes.join(" "), ...(next ? { cursor: asCursorList(next) } : {}), servers };
}
