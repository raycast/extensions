import { Cache, Color, getPreferenceValues } from "@raycast/api";

/**
 * SimpleFIN Bridge client.
 *
 * Protocol reference: https://www.simplefin.org/protocol.html
 * Developer guide:    https://beta-bridge.simplefin.org/info/developers
 *
 * Two constraints drive the design of this file:
 *   1. The /accounts endpoint has a quota of roughly 24 requests per day.
 *      Exceeding it produces warnings and then DISABLES the access token.
 *   2. Upstream data refreshes about once per day per institution, so
 *      aggressive polling buys you nothing anyway.
 *
 * Everything therefore goes through a cache with a hard request floor and a
 * daily request counter.
 */

export interface SimpleFinTransaction {
  id: string;
  posted: number;
  amount: string;
  description?: string;
  payee?: string;
  memo?: string;
  pending?: boolean;
  transacted_at?: number;
}

export interface SimpleFinOrg {
  id?: string;
  name?: string;
  domain?: string;
  "sfin-url"?: string;
  url?: string;
}

export interface SimpleFinAccount {
  id: string;
  name: string;
  currency: string;
  balance: string;
  "available-balance"?: string;
  "balance-date": number;
  org: SimpleFinOrg;
  transactions?: SimpleFinTransaction[];
}

export interface AccountSet {
  errors: string[];
  accounts: SimpleFinAccount[];
  /** Epoch millis of the network fetch this data came from. */
  fetchedAt: number;
  /** True when this came from cache rather than a fresh request. */
  fromCache: boolean;
}

export interface Preferences {
  accessUrl: string;

  prefArchiveDays?: string;
  prefAccountTxn?: string;
  prefGlobalTxnCount?: string;
  prefGlobalTxnDays?: string;
  prefTitleMode?: string;
  prefDateFormat?: string;
  prefDefaultCurrency?: string;
  prefPositiveColor?: string;
  prefNegativeColor?: string;
  minIntervalMinutes?: string;
}

const cache = new Cache({ namespace: "simplefin" });

const KEY_PAYLOAD = "payload";
const KEY_FETCHED_AT = "fetchedAt";
const KEY_COUNTER = "counter";
const KEY_ACCESS_URL = "accessUrl";

/** Absolute ceiling on network requests per calendar day, below SimpleFIN's ~24. */
const MAX_REQUESTS_PER_DAY = 18;
/** Even a forced refresh will not fire more often than this. */
const FORCE_FLOOR_MINUTES = 20;

export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

interface Counter {
  day: string;
  count: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function readCounter(): Counter {
  const raw = cache.get(KEY_COUNTER);
  if (!raw) return { day: today(), count: 0 };
  try {
    const parsed = JSON.parse(raw) as Counter;
    return parsed.day === today() ? parsed : { day: today(), count: 0 };
  } catch {
    return { day: today(), count: 0 };
  }
}

function bumpCounter(): void {
  const c = readCounter();
  cache.set(KEY_COUNTER, JSON.stringify({ day: c.day, count: c.count + 1 }));
}

export function requestsToday(): number {
  return readCounter().count;
}

/**
 * Splits the Access URL into an endpoint and an Authorization header.
 *
 * The Access URL arrives as https://user:pass@host/simplefin. Node's fetch
 * does not reliably forward userinfo embedded in a URL, so the credentials are
 * extracted and sent as an explicit Basic auth header instead.
 */
function buildRequest(
  accessUrl: string,
  days: number,
): { url: string; headers: Record<string, string> } {
  const parsed = new URL(accessUrl.trim());
  const username = decodeURIComponent(parsed.username);
  const password = decodeURIComponent(parsed.password);
  parsed.username = "";
  parsed.password = "";

  const base = parsed.toString().replace(/\/+$/, "");
  const endpoint = new URL(`${base}/accounts`);

  const now = Math.floor(Date.now() / 1000);
  // SimpleFIN caps a single request at a 90 day span.
  const span = Math.min(Math.max(days, 1), 90);
  endpoint.searchParams.set("start-date", String(now - span * 86400));
  endpoint.searchParams.set("end-date", String(now));
  endpoint.searchParams.set("pending", "1");

  const headers: Record<string, string> = { Accept: "application/json" };
  if (username || password) {
    headers.Authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  }

  return { url: endpoint.toString(), headers };
}

function readCache():
  | { accounts: SimpleFinAccount[]; errors: string[]; fetchedAt: number }
  | undefined {
  const raw = cache.get(KEY_PAYLOAD);
  const ts = cache.get(KEY_FETCHED_AT);
  if (!raw || !ts) return undefined;
  try {
    const parsed = JSON.parse(raw) as {
      accounts: SimpleFinAccount[];
      errors: string[];
    };
    return {
      accounts: parsed.accounts ?? [],
      errors: parsed.errors ?? [],
      fetchedAt: Number(ts),
    };
  } catch {
    return undefined;
  }
}

function shouldFetch(force: boolean, minIntervalMinutes: number): boolean {
  const cached = readCache();
  if (!cached) return true;

  if (requestsToday() >= MAX_REQUESTS_PER_DAY) return false;

  const ageMinutes = (Date.now() - cached.fetchedAt) / 60000;
  return force
    ? ageMinutes >= FORCE_FLOOR_MINUTES
    : ageMinutes >= minIntervalMinutes;
}

/**
 * Returns the current account set, hitting the network only when the cache is
 * stale enough and the daily quota allows it.
 */
export async function getAccountSet(force = false): Promise<AccountSet> {
  const prefs = getPrefs();
  const minInterval = Number(prefs.minIntervalMinutes || "90");

  let daysToFetch = 90;
  const cachedForFetch = readCache();

  if (cachedForFetch && cachedForFetch.accounts.length > 0) {
    let newestTs = 0;
    for (const acc of cachedForFetch.accounts) {
      for (const t of acc.transactions || []) {
        const ts = t.transacted_at ?? t.posted;
        if (ts > newestTs) newestTs = ts;
      }
    }
    if (newestTs > 0) {
      const daysAgo = Math.ceil((Date.now() / 1000 - newestTs) / 86400);
      daysToFetch = Math.min(90, Math.max(2, daysAgo + 1));
    }
  }

  if (cache.get(KEY_ACCESS_URL) !== prefs.accessUrl) {
    cache.remove(KEY_PAYLOAD);
    cache.remove(KEY_FETCHED_AT);
    cache.remove(KEY_COUNTER);
    cache.set(KEY_ACCESS_URL, prefs.accessUrl);
    force = true;
    daysToFetch = 90;
  }

  if (!shouldFetch(force, minInterval)) {
    if (cachedForFetch) {
      return { ...cachedForFetch, fromCache: true };
    }
  }

  if (!prefs.accessUrl || !prefs.accessUrl.includes("://")) {
    throw new Error(
      "No SimpleFIN Access URL configured. Add it in extension preferences.",
    );
  }

  const { url, headers } = buildRequest(prefs.accessUrl, daysToFetch);

  let response: Response;
  try {
    bumpCounter();
    response = await fetch(url, { headers });
  } catch (err) {
    const cached = readCache();
    if (cached) return { ...cached, fromCache: true };
    throw new Error(`Could not reach SimpleFIN: ${(err as Error).message}`);
  }

  if (response.status === 403) {
    throw new Error(
      "SimpleFIN rejected the credentials (403). The Access URL may have been revoked.",
    );
  }
  if (!response.ok) {
    const cached = readCache();
    if (cached) return { ...cached, fromCache: true };
    const detail = await response.text().catch(() => "");
    throw new Error(
      `SimpleFIN returned ${response.status}.${detail ? ` ${detail.slice(0, 300)}` : ""}`,
    );
  }

  const body = (await response.json()) as {
    accounts?: SimpleFinAccount[];
    errors?: string[];
  };
  const accounts = body.accounts ?? [];
  const errors = body.errors ?? [];
  const fetchedAt = Date.now();

  const archiveDays = Number(prefs.prefArchiveDays || "365");
  const cutoffTimestamp = Math.floor(Date.now() / 1000) - archiveDays * 86400;
  const oldCached = readCache();

  if (oldCached && oldCached.accounts.length > 0) {
    const oldAccountsMap = new Map<string, SimpleFinAccount>();
    for (const a of oldCached.accounts) {
      oldAccountsMap.set(a.id, a);
    }

    for (const newAccount of accounts) {
      const oldAccount = oldAccountsMap.get(newAccount.id);
      if (oldAccount && oldAccount.transactions) {
        const txnsMap = new Map<string, SimpleFinTransaction>();

        for (const t of oldAccount.transactions) {
          txnsMap.set(t.id, t);
        }
        for (const t of newAccount.transactions || []) {
          txnsMap.set(t.id, t);
        }

        const mergedTxns = Array.from(txnsMap.values()).filter((t) => {
          const ts = t.transacted_at ?? t.posted;
          return ts >= cutoffTimestamp;
        });

        mergedTxns.sort(
          (a, b) =>
            (b.transacted_at ?? b.posted) - (a.transacted_at ?? a.posted),
        );

        newAccount.transactions = mergedTxns;
      } else if (newAccount.transactions) {
        // Just filter and sort new account's transactions if no old account exists
        const txns = newAccount.transactions.filter((t) => {
          const ts = t.transacted_at ?? t.posted;
          return ts >= cutoffTimestamp;
        });
        txns.sort(
          (a, b) =>
            (b.transacted_at ?? b.posted) - (a.transacted_at ?? a.posted),
        );
        newAccount.transactions = txns;
      }
    }
  } else {
    // No old cache, just filter and sort the incoming ones
    for (const newAccount of accounts) {
      if (newAccount.transactions) {
        const txns = newAccount.transactions.filter((t) => {
          const ts = t.transacted_at ?? t.posted;
          return ts >= cutoffTimestamp;
        });
        txns.sort(
          (a, b) =>
            (b.transacted_at ?? b.posted) - (a.transacted_at ?? a.posted),
        );
        newAccount.transactions = txns;
      }
    }
  }

  cache.set(KEY_PAYLOAD, JSON.stringify({ accounts, errors }));
  cache.set(KEY_FETCHED_AT, String(fetchedAt));

  return { accounts, errors, fetchedAt, fromCache: false };
}

export type ThemeColor = Color | { light: string; dark: string };

function parseColorPref(
  colorStr?: string,
  defaultColorStr: string = "green",
): ThemeColor {
  const c = (colorStr?.trim() || defaultColorStr).toLowerCase();
  // If it's a 3 or 6 char hex without a hash, prepend the hash
  if (/^([0-9a-f]{3}|[0-9a-f]{6})$/.test(c)) {
    return { light: `#${c}`, dark: `#${c}` };
  }
  // Otherwise, if it starts with # or is just a string (like 'red', 'lime'), return as-is
  // We can pass any valid CSS color string to { light: str, dark: str }
  // but Raycast's Color enum properties are capitalised, so let's try to map common ones if possible
  switch (c) {
    case "blue":
      return Color.Blue;
    case "purple":
      return Color.Purple;
    case "magenta":
      return Color.Magenta;
    case "orange":
      return Color.Orange;
    case "yellow":
      return Color.Yellow;
    case "green":
      return Color.Green;
    case "red":
      return Color.Red;
    default:
      return {
        light: c.startsWith("#") ? c : c,
        dark: c.startsWith("#") ? c : c,
      };
  }
}

export function getThemeColors(prefs: Preferences): {
  posColor: ThemeColor;
  negColor: ThemeColor;
} {
  return {
    posColor: parseColorPref(prefs.prefPositiveColor, "green"),
    negColor: parseColorPref(prefs.prefNegativeColor, "red"),
  };
}

/** Formats a SimpleFIN decimal string. Falls back to plain digits for non-ISO currencies. */
export function formatAmount(
  value: string | number,
  currency?: string,
  hideSymbolPref?: string,
): string {
  const raw = typeof value === "number" ? value : Number.parseFloat(value);
  if (Number.isNaN(raw)) return "—";
  const n = Math.abs(raw);

  const normCurrency = currency?.trim().toUpperCase();
  const iso =
    normCurrency && /^[A-Za-z]{3}$/.test(normCurrency)
      ? normCurrency
      : undefined;

  let formatted = new Intl.NumberFormat("en-US", {
    ...(iso ? { style: "currency" as const, currency: iso } : {}),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);

  if (hideSymbolPref?.trim()) {
    const sym = hideSymbolPref.trim();
    if (sym === "$" || sym.toUpperCase() === "USD") {
      // Aggressively strip ALL currency letters/symbols (e.g. CA$, £, US$)
      formatted = formatted.replace(/[^\d.,-]/g, "");
    } else {
      formatted = formatted.replaceAll(sym, "");
    }
    formatted = formatted.trim();
  }

  return formatted;
}

/**
 * Institutions disagree about the sign of credit balances. The invert balance
 * setting lets you flip specific accounts so the net total comes out right.
 */
export function signedBalance(
  account: SimpleFinAccount,
  settings?: Record<string, string>,
): number {
  const raw = Number.parseFloat(account.balance);
  if (Number.isNaN(raw)) return 0;
  const shouldInvert = settings?.[`invert_${account.id}`] === "true";
  return shouldInvert ? -raw : raw;
}

export function relativeTime(epochMillis: number): string {
  const minutes = Math.round((Date.now() - epochMillis) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatDate(
  epochSeconds: number,
  format: string = "MM/DD",
): string {
  if (!epochSeconds) return "";
  const date = new Date(epochSeconds * 1000);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const monthsFull = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysFull = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const map: Record<string, string> = {
    YYYY: String(date.getFullYear()),
    YY: String(date.getFullYear()).slice(-2),
    MMMM: monthsFull[date.getMonth()],
    MMM: months[date.getMonth()],
    MM: String(date.getMonth() + 1).padStart(2, "0"),
    M: String(date.getMonth() + 1),
    DD: String(date.getDate()).padStart(2, "0"),
    D: String(date.getDate()),
    dddd: daysFull[date.getDay()],
    ddd: days[date.getDay()],
    d: String(date.getDay()),
  };

  // Match longest tokens first to avoid partial replacements
  return format.replace(
    /YYYY|YY|MMMM|MMM|MM|M|dddd|ddd|DD|D|d/g,
    (match) => map[match],
  );
}

export function sortAccountsAndOrgs(
  accounts: SimpleFinAccount[],
  settings: Record<string, string>,
): { orgKey: string; orgAccounts: SimpleFinAccount[] }[] {
  const byOrg = new Map<string, SimpleFinAccount[]>();
  for (const account of accounts) {
    const key = account.org?.name || account.org?.domain || "Other";
    byOrg.set(key, [...(byOrg.get(key) ?? []), account]);
  }

  let accountOrder: string[] = [];
  try {
    if (settings["accountOrder"])
      accountOrder = JSON.parse(settings["accountOrder"]);
  } catch (_e) {
    // ignore invalid JSON
  }

  for (const [, orgAccounts] of byOrg.entries()) {
    orgAccounts.sort((a, b) => {
      const idxA = accountOrder.indexOf(a.id);
      const idxB = accountOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0;
    });
  }

  let orgOrder: string[] = [];
  try {
    if (settings["orgOrder"]) orgOrder = JSON.parse(settings["orgOrder"]);
  } catch (_e) {
    // ignore invalid JSON
  }

  const orgEntries = Array.from(byOrg.entries()).map(
    ([orgKey, orgAccounts]) => ({ orgKey, orgAccounts }),
  );
  orgEntries.sort((a, b) => {
    const idxA = orgOrder.indexOf(a.orgKey);
    const idxB = orgOrder.indexOf(b.orgKey);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return 0;
  });

  return orgEntries;
}
