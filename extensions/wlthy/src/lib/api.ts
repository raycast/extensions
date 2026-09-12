import { getPreferenceValues } from "@raycast/api";

/**
 * wlthy read-only REST client for Raycast.
 *
 * Everything here hits the same `/api/v1/rest/*` surface the wlthy web app
 * and the MCP tools use, authenticated with a `wlthy_rest_*` key the user
 * pastes into the extension preferences. The key is READ-ONLY by design:
 * the REST surface exposes no mutation endpoints, so this extension can
 * never move money, create an asset, or change a setting. All figures come
 * back in USD from the API.
 */

export interface Dashboard {
  net_worth_usd: number;
  total_assets_usd: number;
  total_debts_usd: number;
  delta_1d_usd: number;
  delta_1d_pct: number;
  delta_30d_usd: number;
  delta_30d_pct: number;
  asset_count: number;
  debt_count: number;
  unvalued_count: number;
}

export type AllocationDimension = "class" | "currency" | "geography" | "sector";

export interface AllocationRow {
  category: string;
  value_usd: number;
  pct: number;
}

export interface Allocation {
  by: string;
  total_usd: number;
  rows: AllocationRow[];
}

function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

/** Normalised base URL, no trailing slash. Defaults to the hosted app. */
export function baseUrl(): string {
  const raw = (prefs().instanceUrl || "https://wlthy.io").trim();
  return raw.replace(/\/+$/, "");
}

/** A human-readable message for the states a user can actually hit, so the
 *  UI never shows a raw stack trace. */
export class WlthyError extends Error {}

async function get<T>(path: string): Promise<T> {
  const key = prefs().apiKey?.trim();
  if (!key) {
    throw new WlthyError(
      "Add your wlthy API key in the extension preferences (⌘ ,).",
    );
  }
  const base = baseUrl();
  // The key is a bearer credential — never attach it to an unencrypted
  // connection. https is required; http is allowed only for loopback hosts
  // (a self-hosted instance reached over localhost, where nothing leaves the
  // machine). This guards the (optional) instanceUrl preference.
  let origin: URL;
  try {
    origin = new URL(base);
  } catch {
    throw new WlthyError("The wlthy URL in preferences isn't a valid URL.");
  }
  const loopback =
    origin.hostname === "localhost" ||
    origin.hostname === "127.0.0.1" ||
    origin.hostname === "::1" ||
    origin.hostname === "[::1]";
  if (origin.protocol !== "https:" && !loopback) {
    throw new WlthyError(
      "For your security the wlthy URL must use https:// — your API key is never sent over an unencrypted connection.",
    );
  }
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1/rest${path}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
  } catch {
    throw new WlthyError(
      "Couldn't reach wlthy. Check your connection or the wlthy URL in preferences.",
    );
  }
  if (res.status === 401) {
    throw new WlthyError(
      "wlthy rejected the key. Create a fresh read-only key in Settings → API & MCP and paste it again.",
    );
  }
  if (res.status === 429) {
    throw new WlthyError("Too many requests — wait a moment and try again.");
  }
  if (!res.ok) {
    throw new WlthyError(
      `wlthy returned an unexpected response (${res.status}).`,
    );
  }
  return (await res.json()) as T;
}

export function getDashboard(): Promise<Dashboard> {
  return get<Dashboard>("/dashboard");
}

export function getAllocation(by: AllocationDimension): Promise<Allocation> {
  return get<Allocation>(`/allocation?by=${by}`);
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  quantity: number | null;
  value_usd: number;
  currency: string;
  valuation_status: string;
}

export interface AssetsResponse {
  assets: Asset[];
  total: number;
}

/** Fetch every asset, following the API's limit/offset pagination so an
 *  account with more than one page still gets the complete list the Assets
 *  command promises. */
export async function getAssets(): Promise<AssetsResponse> {
  const pageSize = 200;
  const first = await get<AssetsResponse>(`/assets?limit=${pageSize}&offset=0`);
  const assets = [...first.assets];
  while (assets.length < first.total) {
    const page = await get<AssetsResponse>(
      `/assets?limit=${pageSize}&offset=${assets.length}`,
    );
    if (page.assets.length === 0) break; // guard against a stale total
    assets.push(...page.assets);
  }
  return { assets, total: first.total };
}

export interface Debt {
  id: string;
  name: string;
  type: string;
  balance_native: number;
  currency: string;
  balance_usd: number;
  country: string | null;
}

export interface DebtsResponse {
  debts: Debt[];
  count: number;
}

export function getDebts(): Promise<DebtsResponse> {
  return get<DebtsResponse>("/debts");
}

export interface CountryRow {
  country: string;
  assets_usd: number;
  debts_usd: number;
  net_usd: number;
  asset_pct: number;
  debt_pct: number;
}

export interface ByCountry {
  total_assets_usd: number;
  total_debts_usd: number;
  total_net_usd: number;
  rows: CountryRow[];
}

export function getByCountry(): Promise<ByCountry> {
  return get<ByCountry>("/holdings/by-country");
}

/** ISO-3166 alpha-2 → flag emoji. "US" → 🇺🇸. Falls back to a globe for
 *  unknown / null codes so a row always has a leading glyph. */
export function flag(code: string | null | undefined): string {
  if (!code || code.length !== 2 || !/^[A-Za-z]{2}$/.test(code)) return "🌍";
  const base = 0x1f1e6;
  const A = "A".charCodeAt(0);
  return String.fromCodePoint(
    base + (code.toUpperCase().charCodeAt(0) - A),
    base + (code.toUpperCase().charCodeAt(1) - A),
  );
}

/** Compact USD formatting: $1.74M, $12.5K, $412. Keeps the menu bar and
 *  list rows readable without a currency library. */
export function money(usd: number): string {
  const sign = usd < 0 ? "-" : "";
  const n = Math.abs(usd);
  if (n >= 1_000_000) return `${sign}$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${sign}$${(n / 1_000).toFixed(1)}K`;
  return `${sign}$${n.toFixed(0)}`;
}

/** Full USD, grouped — for the detail view where precision reads better. */
export function moneyFull(usd: number): string {
  return usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** "+$80.2K (4.83%)" with a leading sign, for a delta line. */
export function delta(usd: number, pct: number): string {
  const s = usd >= 0 ? "+" : "";
  return `${s}${money(usd)} (${s}${pct.toFixed(2)}%)`;
}

/** snake_case category → "Real estate". */
export function label(category: string): string {
  const s = category.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
