import { getPreferenceValues } from "@raycast/api";
import { isIP } from "node:net";
import { BamEntity, IPAddress, ListResponse, Network, ResourceRecord, SearchResult } from "./types";

const RESULT_LIMIT = 50;

let session: { scope: string; header: Promise<string> } | undefined;

export function baseUrl(): string {
  const { serverUrl } = getPreferenceValues<Preferences>();
  const trimmed = serverUrl.trim().replace(/\/+$/, "");
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function apiBaseUrl(): string {
  const url = baseUrl();
  if (!/^https:\/\//i.test(url)) {
    throw new Error("Address Manager URL must use https:// to protect your credentials");
  }
  return `${url}/api/v2`;
}

/** Identifies the configured server and account so cached data isn't reused across them. */
export function cacheScope(): string {
  const { username } = getPreferenceValues<Preferences>();
  return `${baseUrl()}|${username}`;
}

async function errorText(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; reason?: string };
    return body.message ?? body.reason ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

async function login(): Promise<string> {
  const { username, password } = getPreferenceValues<Preferences>();
  const res = await fetch(`${apiBaseUrl()}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed (${res.status}): ${await errorText(res)}`);
  }
  const body = (await res.json()) as { basicAuthenticationCredentials?: string };
  if (!body.basicAuthenticationCredentials) {
    throw new Error("Login response did not include credentials");
  }
  return `Basic ${body.basicAuthenticationCredentials}`;
}

// Concurrent requests share one in-flight login instead of each creating a session.
function authorization(): Promise<string> {
  const scope = cacheScope();
  if (!session || session.scope !== scope) {
    const header = login();
    session = { scope, header };
    header.catch(() => {
      if (session?.header === header) session = undefined;
    });
  }
  return session.header;
}

async function get<T>(path: string, params: Record<string, string> = {}, retry = true): Promise<T> {
  const url = new URL(`${apiBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const auth = authorization();
  const res = await fetch(url, {
    headers: { Authorization: await auth, Accept: "application/hal+json, application/json" },
  });
  if (res.status === 401 && retry) {
    if (session?.header === auth) session = undefined;
    return get<T>(path, params, false);
  }
  if (!res.ok) {
    throw new Error(`BlueCat API error (${res.status}): ${await errorText(res)}`);
  }
  return (await res.json()) as T;
}

// Single quotes delimit values in the v2 filter syntax, so strip them to keep the filter well-formed.
function quote(value: string): string {
  return `'${value.replace(/'/g, "")}'`;
}

async function list<T>(path: string, filter: string): Promise<T[]> {
  const res = await get<ListResponse<T>>(path, { filter, limit: String(RESULT_LIMIT) });
  return res.data ?? [];
}

export type QueryKind = "ip" | "network" | "dns";

export function detectKind(query: string): QueryKind {
  const [addr, prefix, ...rest] = query.split("/");
  if (rest.length === 0 && prefix !== undefined && isIP(addr) && /^\d{1,3}$/.test(prefix)) {
    return "network";
  }
  if (prefix === undefined && isIP(addr)) {
    return "ip";
  }
  return "dns";
}

function prefixLength(range: string): number {
  return Number(range.split("/")[1] ?? 0);
}

function mostSpecificFirst(networks: Network[]): Network[] {
  return [...networks].sort((a, b) => prefixLength(b.range) - prefixLength(a.range));
}

export async function searchIPAM(rawQuery: string): Promise<SearchResult[]> {
  const query = rawQuery.trim();
  if (!query) return [];

  switch (detectKind(query)) {
    case "ip": {
      const [addresses, networks] = await Promise.all([
        list<IPAddress>("/addresses", `address:eq(${quote(query)})`),
        list<Network>("/networks", `range:contains(${quote(query)})`),
      ]);
      const sorted = mostSpecificFirst(networks);
      return [
        ...addresses.map((item): SearchResult => ({ kind: "address", item, network: sorted[0] })),
        ...sorted.map((item): SearchResult => ({ kind: "network", item })),
      ];
    }
    case "network": {
      let networks = await list<Network>("/networks", `range:eq(${quote(query)})`);
      if (networks.length === 0) {
        networks = mostSpecificFirst(await list<Network>("/networks", `range:contains(${quote(query.split("/")[0])})`));
      }
      return networks.map((item) => ({ kind: "network", item }));
    }
    case "dns": {
      const records = await list<ResourceRecord>("/resourceRecords", `absoluteName:contains(${quote(query)})`);
      const zoneIds = await resolveZoneIds(records);
      return records.map((item) => ({ kind: "record", item, zoneId: zoneIds.get(item.id) }));
    }
  }
}

function embeddedZoneId(record: ResourceRecord): number | undefined {
  if (typeof record.zone?.id === "number") return record.zone.id;
  for (const link of Object.values(record._links ?? {})) {
    const match = link?.href?.match(/\/zones\/(\d+)(?:\/|$)/);
    if (match) return Number(match[1]);
  }
  return undefined;
}

function zoneName(record: ResourceRecord): string {
  const name = record.name ?? "";
  return name && record.absoluteName.startsWith(`${name}.`)
    ? record.absoluteName.slice(name.length + 1)
    : record.absoluteName;
}

// Falls back to looking zones up by name when the record payload doesn't reference its zone.
async function resolveZoneIds(records: ResourceRecord[]): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  const missing = new Map<string, ResourceRecord[]>();
  for (const record of records) {
    const id = embeddedZoneId(record);
    if (id !== undefined) {
      result.set(record.id, id);
    } else {
      const zone = zoneName(record);
      missing.set(zone, [...(missing.get(zone) ?? []), record]);
    }
  }
  await Promise.all(
    [...missing.entries()].map(async ([zone, zoneRecords]) => {
      try {
        const [match] = await list<BamEntity>("/zones", `absoluteName:eq(${quote(zone)})`);
        if (match) zoneRecords.forEach((r) => result.set(r.id, match.id));
      } catch {
        // Leave unresolved; the UI hides the open action.
      }
    }),
  );
  return result;
}

export function recordUrl(record: ResourceRecord, zoneId?: number): string | undefined {
  return zoneId !== undefined ? `${baseUrl()}/zones/${zoneId}/resourceRecords/${record.id}` : undefined;
}

export async function getLinkedRecords(addressId: number): Promise<ResourceRecord[]> {
  const res = await get<ListResponse<ResourceRecord>>(`/addresses/${addressId}/resourceRecords`);
  return res.data ?? [];
}

export function networkUrl(network: Network): string {
  return `${baseUrl()}/networks/${network.id}/addresses`;
}

export function addressUrl(address: IPAddress, network?: Network): string | undefined {
  return network ? `${networkUrl(network)}/${address.id}` : undefined;
}
