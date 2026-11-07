// ipdata API client, ported from the Chrome extension's lib/ipdata.js.
import { version as ipVersion, IpVersion } from "./ip";

// The free service answers on ipdata.co (JSON for non-browser clients) and on ipdata.free;
// ipdata.co is primary and ipdata.free the fallback when it cannot be reached.
export const FREE_BASE = "https://ipdata.co";
export const FREE_FALLBACK = "https://ipdata.free";
export const KEYED_BASE = { global: "https://api.ipdata.co", eu: "https://eu-api.ipdata.co" } as const;
// Single-stack hostnames for "your connection": v4.ipdata.co only has an A record and
// v6.ipdata.co only an AAAA record, so each answers with the address of that family.
export const SELF_V4 = "https://v4.ipdata.co/";
export const SELF_V6 = "https://v6.ipdata.co/";

export type Endpoint = keyof typeof KEYED_BASE;
export type Source = "free" | "key";

export interface Settings {
  apiKey: string;
  endpoint: Endpoint;
}

export interface RateInfo {
  limit: number;
  remaining: number | null;
  reset_at: number | null;
  quota_status: string | null;
  updated: number;
}

export type ErrorKind = "invalid" | "key" | "quota" | "network" | "reserved";

export interface Asn {
  asn: string;
  name: string | null;
  domain: string | null;
  route: string | null;
  type: string | null;
}
export interface Company {
  name?: string;
  domain?: string;
  network?: string;
  type?: string;
}
export interface Carrier {
  name: string;
  mcc?: string;
  mnc?: string;
}
export interface TimeZoneInfo {
  name: string;
  abbr: string | null;
  offset: string | null;
  is_dst: boolean | null;
}
export interface Currency {
  name?: string;
  code?: string;
  symbol?: string;
  native?: string;
  plural?: string;
}
export interface Language {
  name?: string;
  native?: string;
  code?: string;
}
export interface Blocklist {
  name?: string;
  site?: string;
  type?: string;
}
export interface ThreatScores {
  vpn_score?: number;
  proxy_score?: number;
  threat_score?: number;
  trust_score?: number;
}
export interface Threat {
  is_tor?: boolean;
  is_vpn?: boolean;
  is_icloud_relay?: boolean;
  is_proxy?: boolean;
  is_datacenter?: boolean;
  is_anonymous?: boolean;
  is_known_attacker?: boolean;
  is_known_abuser?: boolean;
  is_threat?: boolean;
  is_bogon?: boolean;
  blocklists?: Blocklist[];
  scores?: ThreatScores;
}

// One view model for both the free and the keyed response shapes.
export interface IpRecord {
  ip: string;
  version: IpVersion;
  source: Source;
  country_code: string | null;
  country_name: string | null;
  emoji: string;
  is_eu: boolean | null;
  continent: string | null;
  city: string | null;
  region: string | null;
  region_code: string | null;
  postal: string | null;
  calling_code: string | null;
  latitude: number | null;
  longitude: number | null;
  asn: Asn | null;
  org: string | null;
  company: Company | null;
  carrier: Carrier | null;
  time_zone: TimeZoneInfo | null;
  currency: Currency | null;
  languages: Language[] | null;
  threat: Threat | null;
  count: number | null;
}

export type RawRecord = Record<string, unknown>;

export interface LookupOk {
  ok: true;
  model: IpRecord;
  raw: RawRecord;
  rate: RateInfo | null;
  degraded: boolean;
  source: Source;
  host: string;
}
export interface LookupError {
  ok: false;
  kind: ErrorKind;
  message: string;
  status?: number;
  rate?: RateInfo | null;
  source: Source;
  host?: string;
}
export type LookupResult = LookupOk | LookupError;

export interface MyIpOk {
  ok: true;
  v4: LookupOk | null;
  v6: LookupOk | null;
  // With an API key: the keyed lookup's error for an address that was detected but could not be
  // looked up with the key (rejected key, quota, network). The address is still reported.
  v4KeyError?: LookupError;
  v6KeyError?: LookupError;
  rate: RateInfo | null;
}
export interface MyIpError {
  ok: false;
  kind: ErrorKind;
  message: string;
}
export type MyIpResult = MyIpOk | MyIpError;

interface Response {
  status: number;
  ok: boolean;
  json: RawRecord | null;
  text: string;
  headers: Headers;
}

async function request(url: string, timeoutMs = 8000): Promise<Response> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": "raycast-ipdata" },
  });
  const text = await res.text();
  let json: RawRecord | null = null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object") json = parsed as RawRecord;
  } catch {
    /* plain text responses */
  }
  return { status: res.status, ok: res.ok, json, text, headers: res.headers };
}

export function rateFromHeaders(headers: Headers): RateInfo | null {
  const limitHeader = headers.get("ratelimit-limit");
  const limit = Number(limitHeader);
  const remaining = Number(headers.get("ratelimit-remaining"));
  const reset = Number(headers.get("ratelimit-reset"));
  if (!limitHeader || !Number.isFinite(limit)) return null;
  return {
    limit,
    remaining: headers.get("ratelimit-remaining") !== null && Number.isFinite(remaining) ? remaining : null,
    reset_at: headers.get("ratelimit-reset") !== null && Number.isFinite(reset) ? Date.now() + reset * 1000 : null,
    quota_status: headers.get("x-quota-status"),
    updated: Date.now(),
  };
}

function errorFor(status: number, json: RawRecord | null): { kind: ErrorKind; message: string } {
  const msg = json && typeof json.message === "string" ? json.message : "";
  if (status === 400) return { kind: "invalid", message: msg || "Not a valid public IP address" };
  if (status === 401)
    return { kind: "key", message: "The API key was rejected. Check it in the extension preferences." };
  if (status === 403) return { kind: "quota", message: msg || "Quota exceeded for this API key." };
  if (status === 404) return { kind: "invalid", message: msg || "Not found" };
  if (status === 429) return { kind: "quota", message: "Rate limited. Try again in a moment." };
  return { kind: "network", message: msg || `ipdata returned HTTP ${status}` };
}

// Fetch one record and normalize it. `keyed` says which error wording and source apply.
async function fetchRecord(url: string, keyed: boolean, timeoutMs?: number): Promise<LookupResult> {
  const source: Source = keyed ? "key" : "free";
  const host = new URL(url).host;
  let res: Response;
  try {
    res = await request(url, timeoutMs);
  } catch (e) {
    const timedOut = e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError");
    return {
      ok: false,
      kind: "network",
      message: timedOut ? "ipdata did not respond in time" : "Could not reach ipdata (offline?)",
      source,
      host,
    };
  }
  const rate = keyed ? null : rateFromHeaders(res.headers);
  if (!res.ok) return { ok: false, ...errorFor(res.status, res.json), status: res.status, rate, source, host };
  if (!res.json || typeof res.json.ip !== "string") {
    return { ok: false, kind: "network", message: "Unexpected response from ipdata", status: res.status, source, host };
  }
  const model = normalize(res.json, source);
  const quotaStatus = rate?.quota_status ?? "";
  const degraded =
    /exceed|exhaust|degrad|limit/i.test(quotaStatus) ||
    (!keyed && !("city" in res.json) && !("timezone" in res.json) && rate?.remaining === 0);
  return { ok: true, model, raw: res.json, rate, degraded, source, host };
}

// Worth retrying on the other free host: unreachable, a 5xx, or a non-JSON answer.
const retryable = (r: LookupResult) => !r.ok && (r.kind === "network" || (r.status !== undefined && r.status >= 500));

// Look up `ip` (or the caller's own address when ip is null).
export async function lookup(ip: string | null, settings: Settings): Promise<LookupResult> {
  const keyed = !!settings.apiKey;
  // Addresses only contain hex digits, dots and colons, all safe in a path. They are not
  // percent-encoded because ipdata.co does not decode %3A in the path.
  if (ip && !/^[0-9a-fA-F:.]+$/.test(ip)) {
    return { ok: false, kind: "invalid", message: "Not a valid IP address", source: keyed ? "key" : "free" };
  }
  const path = ip ? "/" + ip : "/";
  if (keyed) {
    const base = KEYED_BASE[settings.endpoint] ?? KEYED_BASE.global;
    return fetchRecord(base + path + "?api-key=" + encodeURIComponent(settings.apiKey), true);
  }
  const first = await fetchRecord(FREE_BASE + path, false);
  if (!retryable(first)) return first;
  const second = await fetchRecord(FREE_FALLBACK + path, false);
  return second.ok ? second : first;
}

// Both public addresses of the user, each with its record. The two requests run in
// parallel; a family without connectivity fails fast and is reported as absent.
export async function myIp(settings: Settings): Promise<MyIpResult> {
  const keyed = !!settings.apiKey;
  const [v4free, v6free] = await Promise.all([fetchRecord(SELF_V4, false, 6000), fetchRecord(SELF_V6, false, 6000)]);
  let v4: LookupOk | null = v4free.ok ? v4free : null;
  let v6: LookupOk | null = v6free.ok ? v6free : null;
  let v4KeyError: LookupError | undefined;
  let v6KeyError: LookupError | undefined;
  if (keyed) {
    // With a key, fetch the full record for each address that exists.
    const [k4, k6] = await Promise.all([
      v4 ? lookup(v4.model.ip, settings) : null,
      v6 ? lookup(v6.model.ip, settings) : null,
    ]);
    if (k4) {
      if (k4.ok) v4 = k4;
      else v4KeyError = k4;
    }
    if (k6) {
      if (k6.ok) v6 = k6;
      else v6KeyError = k6;
    }
  }
  if (!v4 && !v6) {
    const err = v4free.ok ? null : v4free;
    return { ok: false, kind: err?.kind ?? "network", message: err?.message ?? "Could not detect your IP address" };
  }
  const rate = (v4free.ok ? v4free.rate : v4free.rate) ?? (v6free.ok ? v6free.rate : v6free.rate) ?? null;
  return { ok: true, v4, v6, v4KeyError, v6KeyError, rate };
}

// ---- normalization -------------------------------------------------------
let displayNames: Intl.DisplayNames | null = null;
export function countryName(code: string | null): string | null {
  if (!code) return null;
  try {
    displayNames = displayNames || new Intl.DisplayNames(["en"], { type: "region" });
    return displayNames.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

export function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

export function localTime(tz: string | null): string | null {
  if (!tz) return null;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date());
  } catch {
    return null;
  }
}

const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const obj = (v: unknown): RawRecord | null =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as RawRecord) : null;

// Map both the free and the keyed response shapes onto one view model.
export function normalize(raw: RawRecord, source: Source): IpRecord {
  const cc = str(raw.country_code) ?? str(raw.country);
  const rawAsn = obj(raw.asn);
  const asn: Asn | null = rawAsn
    ? {
        asn: str(rawAsn.asn) ?? "",
        name: str(rawAsn.name),
        domain: str(rawAsn.domain),
        route: str(rawAsn.route),
        type: str(rawAsn.type),
      }
    : str(raw.asn)
      ? { asn: str(raw.asn) as string, name: str(raw.org), domain: null, route: null, type: null }
      : null;
  const rawTz = obj(raw.time_zone);
  const tzName = str(rawTz?.name) ?? str(raw.timezone);
  const time_zone: TimeZoneInfo | null = tzName
    ? {
        name: tzName,
        abbr: str(rawTz?.abbr),
        offset: str(rawTz?.offset),
        is_dst: bool(rawTz?.is_dst),
      }
    : null;
  const rawCompany = obj(raw.company);
  const rawCarrier = obj(raw.carrier);
  const rawCount = raw.count;
  const count =
    typeof rawCount === "number"
      ? rawCount
      : typeof rawCount === "string" && /^\d+$/.test(rawCount)
        ? Number(rawCount)
        : null;
  return {
    ip: String(raw.ip),
    version: ipVersion(String(raw.ip ?? "")),
    source,
    country_code: cc,
    country_name: str(raw.country_name) ?? countryName(cc),
    emoji: str(raw.emoji_flag) ?? flagEmoji(cc),
    is_eu: bool(raw.is_eu),
    continent: str(raw.continent_name),
    city: str(raw.city),
    region: str(raw.region),
    region_code: str(raw.region_code),
    postal: str(raw.postal),
    calling_code: str(raw.calling_code),
    latitude: num(raw.latitude),
    longitude: num(raw.longitude),
    asn,
    org: str(raw.org) ?? asn?.name ?? null,
    company: rawCompany
      ? {
          name: str(rawCompany.name) ?? undefined,
          domain: str(rawCompany.domain) ?? undefined,
          network: str(rawCompany.network) ?? undefined,
          type: str(rawCompany.type) ?? undefined,
        }
      : null,
    carrier:
      rawCarrier && str(rawCarrier.name)
        ? {
            name: str(rawCarrier.name) as string,
            mcc: str(rawCarrier.mcc) ?? undefined,
            mnc: str(rawCarrier.mnc) ?? undefined,
          }
        : null,
    time_zone,
    currency: obj(raw.currency) as Currency | null,
    languages: Array.isArray(raw.languages) ? (raw.languages as Language[]) : null,
    threat: obj(raw.threat) as Threat | null,
    count,
  };
}
