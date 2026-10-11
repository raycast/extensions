import { XMLParser } from "fast-xml-parser";
import { ERROR_HINTS, WHITELIST_ERROR_NUMBERS } from "./parse-hints";
import type {
  Domain,
  DomainCheckResult,
  DomainListPage,
  PricingTable,
  RawApiResponse,
  RawError,
  NamecheapEnvironment,
  TldPricing,
} from "./types";

/** Elements that may repeat. Forcing arrays avoids the "one item is an object, two are an array" trap. */
const ARRAY_TAGS = new Set([
  "Domain",
  "DomainCheckResult",
  "Error",
  "Warning",
  "ProductType",
  "ProductCategory",
  "Product",
  "Price",
  "List",
]);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  textNodeName: "#text",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (tagName) => ARRAY_TAGS.has(tagName),
});

export class NamecheapApiError extends Error {
  readonly number: string;
  readonly hint: string | undefined;
  /**
   * The address Namecheap rejected, when the error names one. Namecheap echoes the address the request
   * actually came from, which is the authoritative value to whitelist — always prefer it over a detected one.
   */
  readonly requestIp: string | undefined;
  /** Which API the failing request went to. Sandbox and production are separate accounts with separate whitelists. */
  readonly environment: NamecheapEnvironment | undefined;

  constructor(number: string, message: string, environment?: NamecheapEnvironment) {
    super(message);
    this.name = "NamecheapApiError";
    this.number = number;
    this.environment = environment;
    this.requestIp = readRequestIp(message);
    this.hint = ERROR_HINTS[number];
  }

  /** True when the failure is "this address is not on the whitelist". */
  get isWhitelistError(): boolean {
    return WHITELIST_ERROR_NUMBERS.has(this.number);
  }
}

/** Pulls the address out of "Invalid request IP: 203.0.113.10". */
function readRequestIp(message: string): string | undefined {
  const match = /invalid request ip:\s*([0-9a-fA-F.:]+)/i.exec(message);
  return match?.[1];
}

type Rec = Record<string, unknown>;

const isRec = (value: unknown): value is Rec => typeof value === "object" && value !== null && !Array.isArray(value);
const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const str = (value: unknown, fallback = ""): string =>
  value === undefined || value === null ? fallback : String(value);

export const toBool = (value: unknown): boolean => str(value).trim().toLowerCase() === "true";

export function toNumber(value: unknown, fallback = 0): number {
  const text = str(value).trim();
  if (!text) return fallback;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Namecheap returns dates as MM/DD/YYYY. Returns YYYY-MM-DD, or null when the value is not a date. */
export function parseNamecheapDate(value: unknown): string | null {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(str(value).trim());
  if (!match) return null;
  const [, month, day, year] = match;
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

/** Parses the XML envelope and returns the CommandResponse body. Throws NamecheapApiError on Status="ERROR". */
export function parseApiResponse(xml: string, environment?: NamecheapEnvironment): Rec {
  let parsed: RawApiResponse;
  try {
    parsed = parser.parse(xml) as RawApiResponse;
  } catch (error) {
    throw new Error(`Namecheap returned a response that is not valid XML: ${(error as Error).message}`);
  }
  const api = parsed.ApiResponse;
  if (!isRec(api)) throw new Error("Namecheap returned an unexpected response (missing ApiResponse).");

  const status = str(api.Status).toUpperCase();
  if (status !== "OK") {
    const errors = isRec(api.Errors) ? asArray<RawError>(api.Errors.Error) : [];
    const first = errors[0];
    // An <Error> without attributes parses to a bare string, so its text would otherwise be lost.
    const text = typeof first === "string" ? first : str(first?.["#text"]);
    const message = text.trim() || `Namecheap API returned status ${status || "UNKNOWN"}`;
    const number = typeof first === "string" ? "" : str(first?.Number, "");
    throw new NamecheapApiError(number, message, environment);
  }

  const command = api.CommandResponse;
  if (!isRec(command)) return {};
  const body: Rec = { ...command };
  delete body.Type;
  return body;
}

function mapDomain(raw: Rec): Domain {
  return {
    id: str(raw.ID),
    name: str(raw.Name).trim(),
    user: str(raw.User),
    created: parseNamecheapDate(raw.Created),
    expires: parseNamecheapDate(raw.Expires),
    isExpired: toBool(raw.IsExpired),
    isLocked: toBool(raw.IsLocked),
    autoRenew: toBool(raw.AutoRenew),
    whoisGuard: str(raw.WhoisGuard, "NOTPRESENT").toUpperCase() || "NOTPRESENT",
    isPremium: toBool(raw.IsPremium),
    isOurDns: toBool(raw.IsOurDNS),
  };
}

export function parseDomainList(body: Rec): DomainListPage {
  const result = body.DomainGetListResult;
  const domains = (isRec(result) ? asArray<Rec>(result.Domain) : []).map(mapDomain).filter((domain) => domain.name);
  const paging = isRec(body.Paging) ? body.Paging : {};
  return {
    domains,
    totalItems: toNumber(paging.TotalItems, domains.length),
    currentPage: toNumber(paging.CurrentPage, 1),
    pageSize: toNumber(paging.PageSize, domains.length),
  };
}

export function parseDomainCheck(body: Rec): DomainCheckResult[] {
  return asArray<Rec>(body.DomainCheckResult).map((raw) => ({
    domain: str(raw.Domain).trim().toLowerCase(),
    available: toBool(raw.Available),
    errorNo: toNumber(raw.ErrorNo, 0),
    description: str(raw.Description).trim(),
    isPremium: toBool(raw.IsPremiumName),
    premiumRegistrationPrice: toNumber(raw.PremiumRegistrationPrice),
    premiumRenewalPrice: toNumber(raw.PremiumRenewalPrice),
    icannFee: toNumber(raw.IcannFee),
    eapFee: toNumber(raw.EapFee),
  }));
}

/**
 * Namecheap emits rows like Price="0.0" or Price="" that still carry a real figure in YourPrice or
 * RegularPrice. Taking the first value that is present would quote those domains at nothing.
 */
function firstPositive(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = toNumber(value, NaN);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

/** Builds a TLD → pricing table from a users.getPricing response, restricted to one action (REGISTER by default). */
export function parsePricing(body: Rec, action = "REGISTER"): PricingTable {
  const table: PricingTable = {};
  const result = isRec(body.UserGetPricingResult) ? body.UserGetPricingResult : {};
  for (const productType of asArray<Rec>(result.ProductType)) {
    // Live responses say Name="domains"; the documentation example says "DOMAIN". Accept both.
    if (!/^domains?$/i.test(str(productType.Name).trim())) continue;
    for (const category of asArray<Rec>(productType.ProductCategory)) {
      if (str(category.Name).toUpperCase() !== action.toUpperCase()) continue;
      for (const product of asArray<Rec>(category.Product)) {
        const tld = str(product.Name).trim().toLowerCase().replace(/^\.+/, "");
        if (!tld) continue;
        const entry: TldPricing = table[tld] ?? { tld, currency: "USD", byYears: {}, regularByYears: {} };
        for (const price of asArray<Rec>(product.Price)) {
          if (str(price.DurationType, "YEAR").toUpperCase() !== "YEAR") continue;
          const years = toNumber(price.Duration, 0);
          if (years <= 0) continue;
          const effective = firstPositive(price.Price, price.YourPrice, price.RegularPrice);
          if (effective !== undefined) entry.byYears[years] = effective;
          const regular = firstPositive(price.RegularPrice);
          if (regular !== undefined) entry.regularByYears[years] = regular;
          const currency = str(price.Currency).trim();
          if (currency) entry.currency = currency.toUpperCase();
        }
        table[tld] = entry;
      }
    }
  }
  return table;
}
