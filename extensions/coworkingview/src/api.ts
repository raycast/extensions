import https from "node:https";

/** Public, read-only CoworkingView API. No key needed. */
export const API = "https://api.coworkingview.com";

const TIMEOUT_MS = 15000;

/**
 * GET a JSON document with Node's https and a fresh connection per request.
 *
 * Not `fetch`: its pooled keep-alive sockets can be closed by the server while
 * idle, and the resulting "socket idle timeout" is raised outside the request,
 * where it crashes the command instead of reaching the caller.
 */
export function getJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        agent: false,
        timeout: TIMEOUT_MS,
        headers: { Accept: "application/json", "User-Agent": "coworkingview-raycast" },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (body += chunk));
        res.on("error", reject);
        res.on("end", () => {
          const status = res.statusCode ?? 0;
          if (status < 200 || status > 299) {
            reject(new Error(`CoworkingView API answered ${status}`));
            return;
          }
          try {
            resolve(JSON.parse(body) as T);
          } catch {
            reject(new Error("CoworkingView API returned invalid JSON"));
          }
        });
      },
    );
    req.on("timeout", () => req.destroy(new Error(`CoworkingView API did not answer within ${TIMEOUT_MS / 1000} s`)));
    req.on("error", reject);
  });
}

export type Locale = "en" | "de" | "es";

/** Raycast Store extensions are US English only, so the data is requested in English too. */
export function locale(): Locale {
  return "en";
}

export type Money = { amount: number; currency: string };

export type PlaceRef = { slug: string; name: string };

export type City = {
  slug: string;
  name: string;
  countryCode: string;
  propertyCount: number;
  zones: { slug: string; name: string; propertyCount: number }[];
};

export type SpaceSummary = {
  slug: string;
  title: string;
  city?: PlaceRef;
  zone?: PlaceRef;
  operator?: PlaceRef;
  fromPrice?: Money;
  fromBillingPeriod?: string;
  amenities: string[];
  capacity?: number;
  marketPosition?: { verdict: "below" | "around" | "above"; median: Money; sampleSize: number };
  images: { url: string }[];
};

export type PricingOption = {
  optionType: string;
  title: string;
  price?: Money;
  priceOnRequest: boolean;
  billingPeriod: string;
  minCapacity?: number;
  maxCapacity?: number;
};

export type Space = SpaceSummary & {
  description: string;
  address: string;
  pricingOptions: PricingOption[];
  webUrl: string;
};

export type RateFigure = {
  optionType: string;
  median: Money;
  p25: Money | null;
  p75: Money | null;
  sampleSize: number;
  propertyCount: number;
  operatorCount: number;
};

export type CityRates = {
  city: PlaceRef;
  currency: string;
  figures?: RateFigure[];
  dayPass?: { median: Money; sampleSize: number };
  meetingRoom?: { median: Money; sampleSize: number };
  propertyCount?: number;
  operatorCount?: number;
};

export type Envelope<T> = {
  data: T;
  meta: { pagination?: { page: number; pageSize: number; total: number; pageCount: number } };
};

export const WORKSPACE_TYPES: { value: string; title: string }[] = [
  { value: "private_office", title: "Private Office" },
  { value: "fix_desk", title: "Fixed Desk" },
  { value: "flex_desk", title: "Flex Desk" },
  { value: "day_pass", title: "Day Pass" },
  { value: "meeting_room", title: "Meeting Room" },
  { value: "virtual_office", title: "Virtual Office" },
  { value: "event_space", title: "Event Space" },
  { value: "membership", title: "Membership" },
  { value: "exclusive_bereich", title: "Exclusive Area" },
];

export function typeTitle(type: string): string {
  return WORKSPACE_TYPES.find((t) => t.value === type)?.title ?? type;
}

export function money(m?: Money | null): string {
  if (!m) return "";
  const digits = Number.isInteger(m.amount) ? 0 : 2;
  return `${m.currency} ${m.amount.toLocaleString("en", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

const PERIOD: Record<string, string> = { hour: "/hour", day: "/day", week: "/week", month: "/month", year: "/year" };

export function per(period?: string): string {
  return (period && PERIOD[period]) || "";
}

const SEGMENT: Record<Locale, string> = { en: "workspace", de: "buero", es: "oficina" };

/** A space's page on coworkingview.com; the path segment is localized. */
export function spaceUrl(slug: string, l: Locale = locale()): string {
  return `https://coworkingview.com/${l}/${SEGMENT[l]}/${encodeURIComponent(slug)}`;
}

export function cityUrl(slug: string, l: Locale = locale()): string {
  return `https://coworkingview.com/${l}/coworking/${encodeURIComponent(slug)}`;
}

export function priceIndexUrl(slug: string, l: Locale = locale()): string {
  return `https://coworkingview.com/${l}/tools/price-index/${encodeURIComponent(slug)}`;
}
