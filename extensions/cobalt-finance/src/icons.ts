import { Icon } from "@raycast/api";

const BRANDFETCH_CDN = "https://cdn.brandfetch.io";

/**
 * Publishable client-side keys shipped with the extension. Same values baked
 * into the web app via `VITE_BRANDFETCH_CLIENT_ID` / `VITE_LOGO_DEV_PUBLISHABLE_KEY`.
 */
const BRANDFETCH_CLIENT_ID = "1idNVtuBlzoaNohNxPI";
const LOGO_DEV_TOKEN = "pk_HskBniqTTnGkxtC1iry-tQ";

/** Category group systemKey → bundled SVG asset under `assets/categories/`. */
const CATEGORY_ICON: Record<string, string> = {
  BANK_FEES: "categories/card.svg",
  ENTERTAINMENT: "categories/popcorn.svg",
  FOOD_AND_DRINK: "categories/cheese.svg",
  GENERAL_MERCHANDISE: "categories/shopping.svg",
  GENERAL_SERVICES: "categories/settings.svg",
  GOVERNMENT_AND_NON_PROFIT: "categories/government.svg",
  HOME_IMPROVEMENT: "categories/home.svg",
  INCOME: "categories/moneybag.svg",
  LOAN_PAYMENTS: "categories/payment.svg",
  MEDICAL: "categories/hospital.svg",
  PERSONAL_CARE: "categories/health.svg",
  RENT_AND_UTILITIES: "categories/building.svg",
  TRANSFER_IN: "categories/transfer-in.svg",
  TRANSFER_OUT: "categories/transfer-out.svg",
  TRANSPORTATION: "categories/car.svg",
  TRAVEL: "categories/travel.svg",
};

/** Bundled SVG for a category group systemKey, or `Icon.BankNote` if unknown. */
export function categoryIcon(category: string | null | undefined): string | Icon {
  if (!category) {
    return Icon.BankNote;
  }
  return CATEGORY_ICON[category] ?? Icon.BankNote;
}

function hostFromUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) {
    return null;
  }
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Brandfetch `type=icon` with `fallback=lettermark` — single-URL fallback chain. */
function brandfetchIconUrl(domain: string, clientId: string, size = 128): string {
  const url = new URL(`${BRANDFETCH_CDN}/domain/${domain}/w/${size}/h/${size}/fallback/lettermark/type/icon`);
  url.searchParams.set("c", clientId);
  return url.toString();
}

interface InstitutionIconInput {
  institutionLogo: string | null;
  institutionUrl: string | null;
  institutionName: string | null;
  /** Fallback when the `plaidConnection` join didn't resolve an institution row. */
  accountName?: string | null;
}

/** Best-guess domain for common US banks when Plaid `institution.url` is missing. */
const NAME_TO_DOMAIN: Record<string, string> = {
  ally: "ally.com",
  "ally bank": "ally.com",
  "american express": "americanexpress.com",
  amex: "americanexpress.com",
  "apple card": "apple.com",
  "bank of america": "bankofamerica.com",
  barclays: "barclays.com",
  "capital one": "capitalone.com",
  "charles schwab": "schwab.com",
  chase: "chase.com",
  chime: "chime.com",
  citi: "citi.com",
  citibank: "citi.com",
  discover: "discover.com",
  fidelity: "fidelity.com",
  "goldman sachs": "goldmansachs.com",
  hsbc: "hsbc.com",
  marcus: "marcus.com",
  "navy federal": "navyfederal.org",
  pnc: "pnc.com",
  robinhood: "robinhood.com",
  schwab: "schwab.com",
  sofi: "sofi.com",
  td: "td.com",
  "td bank": "td.com",
  "u.s. bank": "usbank.com",
  "us bank": "usbank.com",
  vanguard: "vanguard.com",
  venmo: "venmo.com",
  wealthfront: "wealthfront.com",
  "wells fargo": "wellsfargo.com",
  zelle: "zellepay.com",
};

function domainFromName(name: string | null | undefined): string | null {
  const key = name?.trim().toLowerCase();
  if (!key) {
    return null;
  }
  if (NAME_TO_DOMAIN[key]) {
    return NAME_TO_DOMAIN[key];
  }
  for (const [k, v] of Object.entries(NAME_TO_DOMAIN)) {
    if (key.includes(k)) {
      return v;
    }
  }
  return null;
}

/** Bundled generic bank glyph in a circle — same dimensions as Brandfetch icons. */
const BANK_FALLBACK_ICON = "categories/bank-fallback.svg";

/**
 * Pick best icon for an institution. Always returns something so the column
 * stays consistent across rows:
 *   1. Direct Plaid `institutionLogo` (data URI or HTTPS URL)
 *   2. Brandfetch `type=icon` + `fallback=lettermark` for the host (from
 *      `institutionUrl` or our name→domain map)
 *   3. Generated letter avatar SVG from `institutionName`
 */
export function pickInstitutionIcon(input: InstitutionIconInput): string | null {
  const { accountName, institutionLogo, institutionName, institutionUrl } = input;
  if (institutionLogo?.trim()) {
    const t = institutionLogo.trim();
    if (t.startsWith("data:") || isHttpUrl(t)) {
      return t;
    }
  }
  const host = hostFromUrl(institutionUrl) ?? domainFromName(institutionName) ?? domainFromName(accountName);
  if (host) {
    return brandfetchIconUrl(host, BRANDFETCH_CLIENT_ID);
  }
  return BANK_FALLBACK_ICON;
}

/**
 * Mirror `logoLookupName` from web: trim Plaid descriptions to first 1–2
 * meaningful words for logo.dev brand-name lookup. Stops before hex/digit
 * runs.
 */
export function logoLookupName(raw: string): string {
  const words = raw.trim().split(/\s+/);
  const kept: string[] = [];
  for (const w of words) {
    if (/^[A-F0-9]{6,}$/i.test(w)) {
      break;
    }
    if (/^\d{4,}$/.test(w)) {
      break;
    }
    kept.push(w);
    if (kept.length >= 2) {
      break;
    }
  }
  return kept.join(" ") || raw.trim();
}

const LOGO_DEV_IMG_ORIGIN = "https://img.logo.dev";

/** Logo.dev brand-name URL (public publishable key). Same pattern as web `SubLogo`. */
export function logoDevUrlByBrandName(brandName: string, token: string, size = 128): string {
  const url = new URL(`${LOGO_DEV_IMG_ORIGIN}/name/${encodeURIComponent(brandName)}`);
  url.searchParams.set("token", token);
  url.searchParams.set("size", String(size));
  url.searchParams.set("format", "png");
  return url.toString();
}

interface RecurringIconInput {
  description: string | null;
  merchantName: string | null;
}

/**
 * Icon for a recurring stream. Mirrors `SubLogo` on web:
 *   1. Brandfetch by name → domain map (covers banks like "Chase Direct Deposit")
 *   2. logo.dev `name` endpoint with `logoLookupName(merchantName ?? description)`
 *   3. `Icon.Coins`
 */
export function pickRecurringIcon(input: RecurringIconInput): string | Icon {
  const { description, merchantName } = input;
  const raw = merchantName?.trim() || description?.trim() || "";
  if (!raw) {
    return Icon.Coins;
  }

  const host = domainFromName(raw);
  if (host) {
    return brandfetchIconUrl(host, BRANDFETCH_CLIENT_ID);
  }

  const name = logoLookupName(raw);
  if (name) {
    return logoDevUrlByBrandName(name, LOGO_DEV_TOKEN);
  }

  return Icon.Coins;
}

interface MerchantIconInput {
  /** Cobalt `Transaction.merchant` — cleaned merchant name when available. */
  merchantName: string | null;
  /** Cobalt `Transaction.name` — raw institution description. Fallback for logo lookup. */
  description: string | null;
}

/**
 * Pick the best single icon source for a transaction row. Mirrors
 * `pickRecurringIcon`: try domain-map → logo.dev name lookup → `Icon.Coins`.
 * Cobalt's public `/v1/transactions` API doesn't expose website/logo URLs,
 * so all resolution is name-based.
 */
export function pickMerchantIcon(input: MerchantIconInput): string | Icon {
  const { description, merchantName } = input;
  const raw = merchantName?.trim() || description?.trim() || "";
  if (!raw) {
    return Icon.Coins;
  }

  const host = domainFromName(raw);
  if (host) {
    return brandfetchIconUrl(host, BRANDFETCH_CLIENT_ID);
  }

  const name = logoLookupName(raw);
  if (name) {
    return logoDevUrlByBrandName(name, LOGO_DEV_TOKEN);
  }

  return Icon.Coins;
}
