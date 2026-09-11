import { createHash } from "crypto";
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

const cache = new Cache({ namespace: "simplefin" });

const KEY_PAYLOAD = "payload";
const KEY_FETCHED_AT = "fetchedAt";
const KEY_COUNTER = "counter";
/** SHA-256 of the Access URL, kept only to notice when the user swaps it. */
const KEY_ACCESS_HASH = "accessUrlHash";
/** Older builds cached the Access URL itself, in plain text. */
const LEGACY_KEY_ACCESS_URL = "accessUrl";

/** Absolute ceiling on network requests per calendar day, below SimpleFIN's ~24. */
export const MAX_REQUESTS_PER_DAY = 18;
/** Even a forced refresh will not fire more often than this. */
const FORCE_FLOOR_MINUTES = 20;

/** `Preferences` is generated from package.json into raycast-env.d.ts. */
export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

/**
 * Reads a numeric text preference. Blank, non-numeric or out-of-range input
 * falls back to the default, so a typo can never become NaN downstream.
 */
export function numberPref(
  value: string | undefined,
  fallback: number,
  min = 0,
): number {
  const text = (value ?? "").trim();
  const n = Number(text);
  return text !== "" && Number.isFinite(n) && n >= min ? n : fallback;
}

function fingerprint(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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

export function resetCounter(): void {
  cache.set(KEY_COUNTER, JSON.stringify({ day: today(), count: 0 }));
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
  // The cap comes first. Checked after the cache, a fresh install whose
  // requests keep failing would retry on every launch with no ceiling at all.
  if (requestsToday() >= (force ? 24 : MAX_REQUESTS_PER_DAY)) return false;

  const cached = readCache();
  if (!cached) return true;

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
  const minInterval = numberPref(prefs.minIntervalMinutes, 90);

  const accessUrl = prefs.accessUrl?.trim();
  const accessHash = accessUrl ? fingerprint(accessUrl) : undefined;

  // Drop the plain-text copy older builds kept. The same URL means the same
  // data and the same quota, so carry both over rather than treat it as new.
  const legacyUrl = cache.get(LEGACY_KEY_ACCESS_URL);
  if (legacyUrl !== undefined) {
    cache.remove(LEGACY_KEY_ACCESS_URL);
    if (accessHash && legacyUrl === accessUrl) {
      cache.set(KEY_ACCESS_HASH, accessHash);
    }
  }

  let daysToFetch = 90;

  if (cache.get(KEY_ACCESS_HASH) !== accessHash) {
    cache.remove(KEY_PAYLOAD);
    cache.remove(KEY_FETCHED_AT);
    cache.remove(KEY_COUNTER);
    if (accessHash) {
      cache.set(KEY_ACCESS_HASH, accessHash);
    } else {
      cache.remove(KEY_ACCESS_HASH);
    }
    force = true;
  }

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

  if (!shouldFetch(force, minInterval)) {
    if (cachedForFetch) {
      return { ...cachedForFetch, fromCache: true };
    }
    // With nothing cached, only the daily cap refuses a fetch.
    throw new Error(
      `Daily SimpleFIN request limit reached (${requestsToday()} today). It resets at midnight UTC.`,
    );
  }

  if (!accessUrl || !accessUrl.includes("://")) {
    throw new Error(
      "No SimpleFIN Access URL configured. Add it in extension preferences.",
    );
  }

  const { url, headers } = buildRequest(accessUrl, daysToFetch);

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

  // At least one day: 0 or NaN would filter out, then persist, every transaction.
  const archiveDays = numberPref(prefs.prefArchiveDays, 365, 1);
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

/**
 * Pure hex rather than Color.Green / Color.Red: Raycast's named colours are
 * muted and theme-adaptive, which reads as washed out against menu bar text.
 */
export const DEFAULT_POSITIVE_COLOR = "0f0";
export const DEFAULT_NEGATIVE_COLOR = "f00";

export function getThemeColors(prefs: Preferences): {
  posColor: ThemeColor;
  negColor: ThemeColor;
} {
  return {
    posColor: parseColorPref(prefs.prefPositiveColor, DEFAULT_POSITIVE_COLOR),
    negColor: parseColorPref(prefs.prefNegativeColor, DEFAULT_NEGATIVE_COLOR),
  };
}

/** Formats a SimpleFIN decimal string. Falls back to plain digits for non-ISO currencies. */
/**
 * SimpleFIN allows `currency` to be a 3-letter ISO code *or* a URL naming a
 * non-standard currency. The old code only accepted the bare ISO form and fell
 * through to a plain number for everything else, which is why amounts rendered
 * with no symbol at all no matter what the hide-symbol preference said.
 */
function resolveCurrency(currency?: string): string {
  const raw = (currency ?? "").trim();
  if (/^[A-Za-z]{3}$/.test(raw)) return raw.toUpperCase();
  // Non-ISO URLs conventionally end in the code, e.g. .../currency/USD
  const tail = raw.match(/([A-Za-z]{3})\/?$/);
  return tail ? tail[1].toUpperCase() : "USD";
}

export function formatAmount(
  value: string | number,
  currency?: string,
  hideSymbolPref?: string,
  fractionDigits = 2,
): string {
  const raw = typeof value === "number" ? value : Number.parseFloat(value);
  if (Number.isNaN(raw)) return "—";
  const n = Math.abs(raw);

  const iso = resolveCurrency(currency);

  let formatted: string;
  try {
    formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: iso,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(n);
  } catch {
    // Intl throws RangeError on a code it does not recognise.
    formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(n);
  }

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
 * formatAmount with a leading minus on negatives. Rows show direction with an
 * arrow instead, but totals and anything copied must keep the sign.
 */
export function formatSignedAmount(
  value: string | number,
  currency?: string,
  hideSymbolPref?: string,
  fractionDigits = 2,
): string {
  const formatted = formatAmount(
    value,
    currency,
    hideSymbolPref,
    fractionDigits,
  );
  const raw = typeof value === "number" ? value : Number.parseFloat(value);
  // Compare after rounding so -0.004 does not come out as "-$0.00".
  return Number(raw.toFixed(fractionDigits)) < 0 ? `-${formatted}` : formatted;
}

/**
 * Payment processors and wallets prepend their own routing junk to the merchant
 * name, so "Kura Revolving Sushi" arrives as "APLPAY KURA REVOLVIN". These are
 * stripped as case-insensitive literal substrings, longest first, so that a
 * token like "SQ *" is consumed before a shorter overlapping one.
 */
export const DEFAULT_STRIP_STRINGS = [
  "recurring payment authorized on",
  "purchase authorized on",
  "debit card purchase",
  "preauthorized debit",
  "recurring payment",
  "card purchase",
  "recurring pmt",
  "pos purchase",
  "pos debit",
  "ach debit",
  "checkcard",
  "chkcard",
  "aplpay",
  "apple pay",
  "google pay",
  "https://",
  "http://",
  "www.",
].join(", ");

/**
 * LocalStorage key for the user's strip list. It lives here rather than in
 * extension preferences so the Transactions panel can edit it inline, and so
 * it arrives with the same `LocalStorage.allItems()` read that every view
 * already performs for account settings.
 */
export const STRIP_STORAGE_KEY = "cfg_stripStrings";

/** Whether the Transactions panel had its detail pane open last time. */
export const DETAIL_STORAGE_KEY = "cfg_showDetail";

/**
 * Payment processors prefix the merchant with their own tag and an asterisk:
 * SQ *BLUE BOTTLE, TST* THE DINER, PP*GRUBHUB, PAYPAL *STEAM, CASHAPP*BOB.
 *
 * One anchored rule covers every one of them, which is why the strip list no
 * longer enumerates "SQ *", "SQ*", "PAYPAL *", "PAYPAL*", "PP*" and friends.
 * Anchoring is what makes it safe — an unanchored "PP*" would maul CASHAPP*BOB,
 * and a bare "*" would leave the tag behind ("SQ*FOO" -> "SQ FOO").
 *
 * The tag must be plain alphanumerics, so "AMAZON.COM*RT4G51" is left alone:
 * the dot stops the match and the merchant survives intact.
 */
const PROCESSOR_PREFIX = /^\s*[a-z0-9]{2,12}\s*\*\s*/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strips tokens, returning "" when nothing survives. */
function stripTokens(label: string, csv?: string): string {
  // The stored list replaces the built-ins outright: the editor is prepopulated
  // with them, so "what you see is what runs" with no merge rules to reason about.
  const source = csv?.trim() ? csv : DEFAULT_STRIP_STRINGS;
  const tokens = source
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    // Longest first so overlapping tokens resolve to the more specific match.
    .sort((a, b) => b.length - a.length);

  let out = label;
  // Two passes: removing a phrase can expose a processor tag beneath it,
  // as in "AplPay TST* MEANWHILAUSTIN TX".
  for (let pass = 0; pass < 2; pass++) {
    for (const token of tokens) {
      out = out.replace(new RegExp(escapeRegExp(token), "gi"), " ");
    }
    out = out.replace(/\s+/g, " ").trim();
    out = out.replace(PROCESSOR_PREFIX, "");
  }

  return out
    .replace(/\s+/g, " ")
    .replace(/^[\s*·|:#,-]+|[\s*·|:#,-]+$/g, "")
    .trim();
}

/** Strips noise, falling back to the original when nothing survives. */
export function stripNoise(label: string, csv?: string): string {
  return stripTokens(label, csv) || label.trim();
}

export function payeeName(
  txn: Pick<SimpleFinTransaction, "payee" | "description" | "memo">,
  csv?: string,
): string {
  const candidates = [txn.payee, txn.description, txn.memo]
    .map((v) => (v ?? "").trim())
    .filter(Boolean);

  // Field order is the preference; fall through only when a field is pure
  // noise. Picking the *longest* survivor instead would demote a clean
  // payee ("Amazon") in favour of a raw descriptor ("AMAZON.COM*RT4G51").
  for (const candidate of candidates) {
    const stripped = stripTokens(candidate, csv);
    if (stripped) return stripped;
  }
  return candidates[0] || "Transaction";
}

/**
 * One canonical rendering of a transaction, so the menu bar and the
 * Transactions panel copy exactly the same text.
 */
export const DEFAULT_SEPARATOR = "\u2022";

/** The user's chosen separator, padded, e.g. "  \u2022  ". */
export function separator(pref?: string): string {
  return ` ${(pref ?? "").trim() || DEFAULT_SEPARATOR} `;
}

/**
 * One canonical rendering of a transaction, so the menu bar and the
 * Transactions panel copy exactly the same text.
 */
export function formatTransactionDetail(
  txn: SimpleFinTransaction,
  opts: {
    accountName?: string;
    currency?: string;
    defaultCurrency?: string;
    dateFormat?: string;
    stripStrings?: string;
    separator?: string;
  },
): string {
  const date = formatDate(txn.transacted_at ?? txn.posted, opts.dateFormat);
  const amount = formatAmount(txn.amount, opts.currency, opts.defaultCurrency);
  const signed = Number.parseFloat(txn.amount) < 0 ? `-${amount}` : amount;

  const parts = [
    date,
    opts.accountName,
    payeeName(txn, opts.stripStrings),
    signed,
  ]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);

  // Keep the untouched descriptor when cleaning actually changed something.
  const raw = [txn.description, txn.memo]
    .map((v) => (v ?? "").trim())
    .filter(Boolean)
    .filter((v, i, all) => all.indexOf(v) === i)
    .join(" ");
  if (raw && !parts.includes(raw)) parts.push(raw);
  if (txn.pending) parts.push("pending");

  return parts.join(separator(opts.separator));
}

/** Section heading for a day of transactions. */
export function dateHeading(epochSeconds: number, format?: string): string {
  if (!epochSeconds) return "";
  const date = new Date(epochSeconds * 1000);
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / 86400000,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return formatDate(epochSeconds, format?.trim() || DEFAULT_DATE_FORMAT);
}

/** Groups transactions into consecutive same-day buckets, preserving order. */
export function groupByDay<
  T extends { posted: number; transacted_at?: number },
>(txns: T[], format?: string): { key: string; heading: string; items: T[] }[] {
  const groups: { key: string; heading: string; items: T[] }[] = [];
  for (const txn of txns) {
    const epoch = txn.transacted_at ?? txn.posted;
    const key = new Date(epoch * 1000).toDateString();
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(txn);
    else
      groups.push({ key, heading: dateHeading(epoch, format), items: [txn] });
  }
  return groups;
}

/**
 * Right-aligning numbers in a macOS menu.
 *
 * Menus render in SF Pro, which is proportional *including its digits* — "1"
 * is 0.45em where "4" is 0.63em. Measured with CoreText at 14pt, so padding by
 * digit COUNT cannot work: ten amounts padded that way still spanned an 11.8pt
 * ragged edge. Raycast exposes no font control, so tabular figures are out.
 *
 * Instead each amount is measured against a table of em-normalized advances
 * and padded to a shared target with a palette of Unicode spaces of descending
 * width. Greedy fitting down to U+200A (0.06em) lands every row within ~0.6pt
 * of the target — sub-pixel, and it keeps ordinary digits, so the text stays
 * copyable and screen-reader friendly.
 *
 * Regenerate the table with CTFontGetAdvancesForGlyphs if Apple reflows SF Pro.
 */
const FIGURE_SPACE = String.fromCharCode(0x2007);
const PUNCTUATION_SPACE = String.fromCharCode(0x2008);
const THIN_SPACE = String.fromCharCode(0x2009);
const HAIR_SPACE = String.fromCharCode(0x200a);

/** Unicode spaces, widest first, used to fill the gap to the target width. */
const PAD_CHARS: [string, number][] = [
  [FIGURE_SPACE, 0.6191],
  [PUNCTUATION_SPACE, 0.2861],
  [THIN_SPACE, 0.1299],
  [HAIR_SPACE, 0.0596],
];

const GLYPH_EM: Record<string, number> = {
  "0": 0.6191,
  "1": 0.4531,
  "2": 0.5928,
  "3": 0.6162,
  "4": 0.6328,
  "5": 0.6074,
  "6": 0.626,
  "7": 0.5586,
  "8": 0.6279,
  "9": 0.626,
  ",": 0.2861,
  ".": 0.2861,
  "-": 0.4609,
  "+": 0.6191,
  " ": 0.2705,
  $: 0.6191,
  "\u20ac": 0.6191,
  "\u00a3": 0.6191,
  "\u00a5": 0.6191,
  "\u20b9": 0.6191,
  "(": 0.3711,
  ")": 0.3711,
  // The pad characters themselves, so textWidth stays correct on padded text.
  ...Object.fromEntries(PAD_CHARS),
};

const FINEST = PAD_CHARS[PAD_CHARS.length - 1][1];

/** Width of a rendered amount in em units. Unknown glyphs fall back to a digit. */
export function textWidth(text: string): number {
  let total = 0;
  for (const ch of text) total += GLYPH_EM[ch] ?? GLYPH_EM["0"];
  return total;
}

export type AmountWidth = { target: number };

/** The widest amount in a set becomes the shared alignment column. */
export function maxAmountWidth(formatted: string[]): AmountWidth {
  return {
    target: formatted.reduce((max, f) => Math.max(max, textWidth(f)), 0),
  };
}

/** Left-pad an amount with Unicode spaces so its right edge meets the column. */
export function padAmount(formatted: string, max: AmountWidth): string {
  let deficit = max.target - textWidth(formatted);
  if (deficit <= FINEST / 2) return formatted;

  let pad = "";
  // Widest space that still fits, repeatedly, down to the hair space.
  for (const [char, width] of PAD_CHARS) {
    while (deficit >= width - FINEST / 2) {
      pad += char;
      deficit -= width;
    }
  }
  return pad + formatted;
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

/**
 * Net total per currency, largest first. Balances in different currencies
 * cannot be added together, so each gets its own total.
 */
export function totalsByCurrency(
  accounts: SimpleFinAccount[],
  settings: Record<string, string>,
): { currency: string; total: number }[] {
  const totals = new Map<string, number>();
  for (const account of accounts) {
    if (settings[`exclude_${account.id}`] === "true") continue;
    const iso = resolveCurrency(account.currency);
    totals.set(iso, (totals.get(iso) ?? 0) + signedBalance(account, settings));
  }
  return Array.from(totals, ([currency, total]) => ({ currency, total })).sort(
    (a, b) => Math.abs(b.total) - Math.abs(a.total),
  );
}

export function relativeTime(epochMillis: number): string {
  const minutes = Math.round((Date.now() - epochMillis) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Unicode/ICU date field symbols, as used by Java, Swift and NSDateFormatter. */
export const DEFAULT_DATE_FORMAT = "MM-dd";

const MONTHS_SHORT = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split(
  " ",
);
const MONTHS_LONG =
  "January February March April May June July August September October November December".split(
    " ",
  );
const DAYS_SHORT = "Sun Mon Tue Wed Thu Fri Sat".split(" ");
const DAYS_LONG =
  "Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" ");

/**
 * Formats an epoch using ICU date field symbols: y/yy/yyyy, M/MM/MMM/MMMM,
 * d/dd, E/EEEE, h/HH/mm. Text inside single quotes is emitted literally.
 *
 * Note that ICU is case-sensitive in a way that trips people up: uppercase
 * "DD" is day-of-year and "D" is not day-of-month, so a pattern written
 * "MM/DD" is wrong — it is "MM/dd".
 */
export function formatDate(
  epochSeconds: number,
  format: string = DEFAULT_DATE_FORMAT,
): string {
  if (!epochSeconds) return "";
  const date = new Date(epochSeconds * 1000);

  const h12 = date.getHours() % 12 || 12;
  const map: Record<string, string> = {
    yyyy: String(date.getFullYear()),
    yy: String(date.getFullYear()).slice(-2),
    y: String(date.getFullYear()),
    MMMM: MONTHS_LONG[date.getMonth()],
    MMM: MONTHS_SHORT[date.getMonth()],
    MM: String(date.getMonth() + 1).padStart(2, "0"),
    M: String(date.getMonth() + 1),
    dd: String(date.getDate()).padStart(2, "0"),
    d: String(date.getDate()),
    EEEE: DAYS_LONG[date.getDay()],
    EEE: DAYS_SHORT[date.getDay()],
    E: DAYS_SHORT[date.getDay()],
    HH: String(date.getHours()).padStart(2, "0"),
    H: String(date.getHours()),
    hh: String(h12).padStart(2, "0"),
    h: String(h12),
    mm: String(date.getMinutes()).padStart(2, "0"),
    m: String(date.getMinutes()),
    a: date.getHours() < 12 ? "AM" : "PM",
  };

  // Longest runs first so "MMMM" wins over "MMM"; quoted spans pass through.
  return format.replace(
    /'([^']*)'|yyyy|yy|y|MMMM|MMM|MM|M|dd|d|EEEE|EEE|E|HH|H|hh|h|mm|m|a/g,
    (match, quoted) => (quoted !== undefined ? quoted : (map[match] ?? match)),
  );
}

export function formatRefreshTime(
  timestamp: number,
  customDateFormat?: string,
): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const epochSeconds = Math.floor(timestamp / 1000);

  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / 86400000,
  );

  const timeStr = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });

  if (days === 0) return `Today at ${timeStr}`;
  if (days === 1) return `Yesterday at ${timeStr}`;

  const format =
    (customDateFormat ?? getPrefs().prefDateFormat)?.trim() ||
    DEFAULT_DATE_FORMAT;
  if (format.includes("h") || format.includes("H")) {
    return formatDate(epochSeconds, format);
  }
  return `${formatDate(epochSeconds, format)} at ${timeStr}`;
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
  } catch {
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
  } catch {
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

/* ------------------------------------------------------------------ *
 * Row templates
 * ------------------------------------------------------------------ */

/**
 * A row is described by a template rather than hard-coded field order.
 *
 * Tokens are {field} or {field:format}, where format is an ICU date pattern.
 * {date} is the transaction date and defaults to the Day Heading Format
 * preference; give it an explicit format to override. Literal text between
 * tokens is kept, and a token that resolves empty takes its surrounding
 * punctuation with it, so "({account})" leaves no stray parentheses behind.
 */
export const DEFAULT_ROW_TEMPLATE =
  "{date} \u2022 {amount} \u2022 {payee} ({account})";

export type TemplateContext = {
  txn: SimpleFinTransaction;
  accountName?: string;
  currency?: string;
  defaultCurrency?: string;
  stripStrings?: string;
  columns?: ColumnWidths;
  /** Fallback format for {date} when the token carries none. */
  dateFormat?: string;
  /** False inside an account submenu, where the account is already implied. */
  showAccount?: boolean;
};

const TOKEN = /\{([a-z_][a-z0-9_]*)(?::([^}]*))?\}/gi;

/** Field names a template references, used to keep tooltips non-redundant. */
export function templateFields(template: string): Set<string> {
  const out = new Set<string>();
  for (const m of template.matchAll(TOKEN)) out.add(m[1].toLowerCase());
  return out;
}

function resolveField(
  field: string,
  format: string | undefined,
  ctx: TemplateContext,
): string {
  const { txn } = ctx;
  switch (field) {
    case "amount": {
      const formatted = formatAmount(
        txn.amount,
        ctx.currency,
        ctx.defaultCurrency,
      );
      return formatted;
    }
    // The cleaned display name, which falls through to description when the
    // payee field is pure processor noise. Use payee_raw for the literal field.
    case "payee":
      return payeeName(txn, ctx.stripStrings);
    case "payee_raw":
      return (txn.payee ?? "").trim();
    case "account":
      return ctx.showAccount === false ? "" : (ctx.accountName ?? "").trim();
    case "date":
    case "transacted_at":
      return formatDate(
        txn.transacted_at ?? txn.posted,
        format ?? ctx.dateFormat,
      );
    case "posted":
      return formatDate(txn.posted, format);
    case "pending":
      return txn.pending ? "pending" : "";
    default: {
      const value = (txn as unknown as Record<string, unknown>)[field];
      return value === undefined || value === null ? "" : String(value).trim();
    }
  }
}

/**
 * Separator handling is split three ways because a hyphen is not always a
 * separator: "-$24.56" starts with one, "MM-dd" contains one. Collapsing or
 * left-trimming on hyphens ate the minus sign off negative amounts.
 */
const SEP_COLLAPSE = "\\u2022\\u00b7|/,;";
const SEP_LEAD = SEP_COLLAPSE;
const SEP_TRAIL = SEP_COLLAPSE + "\\u2013\\u2014-";

/**
 * Removes the debris an empty token leaves behind: "( )", " \u2022  \u2022 ",
 * a trailing bullet. Deliberately trims ASCII blanks only — the alignment pad
 * characters are Unicode spaces and must survive at the start of a field.
 */
function tidy(text: string): string {
  const collapse = new RegExp(`(?:[ \\t]*([${SEP_COLLAPSE}])[ \\t]*){2,}`, "g");
  return text
    .replace(/\(\s*\)/g, "")
    .replace(/\[\s*\]/g, "")
    .replace(collapse, " $1 ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(new RegExp(`^[ \\t${SEP_LEAD}]+`), "")
    .replace(new RegExp(`[ \\t${SEP_TRAIL}]+$`), "");
}

/**
 * Target widths keyed by field name. Any token with an entry is left-padded to
 * a shared column, which is what keeps amounts (and the dates in front of
 * them) lined up despite SF Pro's proportional digits.
 */
export type ColumnWidths = Record<string, AmountWidth>;

/** Measures a column for every field a template pads. */
export function measureColumns(
  template: string,
  rows: TemplateContext[],
  fields: string[] = ["amount", "date", "transacted_at", "posted"],
): ColumnWidths {
  const used = templateFields(template);
  const out: ColumnWidths = {};
  for (const field of fields) {
    if (!used.has(field)) continue;
    const format = templateFormat(template, field);
    const rendered = rows.map((ctx) => resolveField(field, format, ctx));
    out[field] = maxAmountWidth(rendered);
  }
  return out;
}

/** The :format attached to a token, if any. */
function templateFormat(template: string, field: string): string | undefined {
  for (const m of template.matchAll(TOKEN)) {
    if (m[1].toLowerCase() === field) return m[2];
  }
  return undefined;
}

/** Renders a row template into a single menu row string. */
export function renderTemplate(template: string, ctx: TemplateContext): string {
  const source = template.trim() || DEFAULT_ROW_TEMPLATE;
  return tidy(
    source.replace(TOKEN, (_m, rawField, format) => {
      const field = String(rawField).toLowerCase();
      const value = resolveField(field, format, ctx);
      const width = ctx.columns?.[field];
      return width && value ? padAmount(value, width) : value;
    }),
  );
}

function extraFields(
  template: string,
  ctx: TemplateContext,
  opts: { includePosted: boolean },
): { label: string; value: string }[] {
  const used = templateFields(template);
  const { txn } = ctx;
  const shown = payeeName(txn, ctx.stripStrings);
  const out: { label: string; value: string }[] = [];

  const add = (label: string, value?: string) => {
    const v = (value ?? "").trim();
    if (v && v !== shown && !out.some((e) => e.value === v)) {
      out.push({ label, value: v });
    }
  };

  if (!used.has("description")) add("Description", txn.description);
  if (!used.has("memo")) add("Memo", txn.memo);
  if (!used.has("payee_raw") && txn.payee?.trim() !== shown)
    add("Payee", txn.payee);
  if (!used.has("account") && ctx.showAccount === false)
    add("Account", ctx.accountName);
  if (
    opts.includePosted &&
    !used.has("posted") &&
    txn.transacted_at &&
    txn.posted !== txn.transacted_at
  ) {
    add("Posted", formatDate(txn.posted, "EEE, MMM d, yyyy"));
  }
  if (txn.pending && !used.has("pending")) add("Status", "Pending");

  return out;
}

/** Detail the row does not already show, for the tooltip. */
export function tooltipExtra(template: string, ctx: TemplateContext): string {
  const fields = extraFields(template, ctx, { includePosted: true });
  // A single field needs no label — the value speaks for itself.
  if (fields.length === 1) return fields[0].value;
  return fields.map((f) => `${f.label}: ${f.value}`).join("\n");
}

/**
 * Detail appended to the \u2325-expanded row. Never labelled and without the
 * posted date — the row is a single line, so labels and a settlement date the
 * user did not ask for are noise there. The tooltip still carries both.
 */
export function rowExtra(template: string, ctx: TemplateContext): string {
  return extraFields(template, ctx, { includePosted: false })
    .map((f) => f.value)
    .join("  ");
}

/**
 * Relevance score for one field, 0 meaning no match.
 *
 * Raycast's built-in list filter is a pure subsequence match, so searching
 * "123" ranks "18.23" (1…2 3) alongside "123.74". Scoring by match quality
 * puts literal and prefix hits above scattered-character ones.
 */
function fieldScore(value: string, query: string): number {
  if (!value) return 0;
  const v = value.toLowerCase();
  if (v === query) return 100;
  if (v.startsWith(query)) return 80;
  if (new RegExp(`\\b${escapeRegExp(query)}`).test(v)) return 60;
  if (v.includes(query)) return 40;

  // Subsequence: every query character appears in order. Weakest match.
  let i = 0;
  for (const ch of v) {
    if (ch === query[i]) i += 1;
    if (i === query.length) return 10;
  }
  return 0;
}

/** Best score across a transaction's searchable fields. */
export function searchScore(
  fields: (string | undefined)[],
  query: string,
): number {
  const q = query.trim().toLowerCase();
  if (!q) return 1;
  let best = 0;
  for (const field of fields) {
    best = Math.max(best, fieldScore((field ?? "").toLowerCase(), q));
    if (best === 100) break;
  }
  return best;
}

/**
 * Claims a SimpleFIN setup token and returns the Access URL.
 *
 * The token is a base64-encoded claim URL; POSTing to it once returns the
 * permanent Access URL. Tokens are single-use, so a second attempt with the
 * same token fails — that is the bridge working as intended, not a bug.
 */
export async function claimSetupToken(token: string): Promise<string> {
  const trimmed = token.trim();
  if (!trimmed) throw new Error("Paste your setup token first.");

  let claimUrl: string;
  try {
    claimUrl = Buffer.from(trimmed, "base64").toString("utf8").trim();
  } catch {
    throw new Error("That does not decode as a setup token.");
  }
  if (!/^https?:\/\//i.test(claimUrl)) {
    throw new Error(
      "Decoded token is not a URL. Copy the whole token, with no line breaks.",
    );
  }

  let response: Response;
  try {
    response = await fetch(claimUrl, { method: "POST" });
  } catch (err) {
    throw new Error(`Could not reach the bridge: ${(err as Error).message}`);
  }

  if (!response.ok) {
    throw new Error(
      response.status === 403
        ? "This token was already claimed. Create a new one on the bridge."
        : `The bridge rejected the claim (HTTP ${response.status}).`,
    );
  }

  const accessUrl = (await response.text()).trim();
  if (!accessUrl.includes("://")) {
    throw new Error("The bridge did not return an Access URL.");
  }
  return accessUrl;
}
