import { LocalStorage } from "@raycast/api";
import pkg from "../../package.json";

const HEADERS = {
  "User-Agent": `Mozilla/5.0 (compatible; ${pkg.name})`,
} as const;

const COOKIE_CRUMB_KEY = "yahoo-cookie-crumb";

export async function get<T>(path: string, params: { [key: string]: string }, signal: AbortSignal): Promise<T> {
  // Requests to Yahoo Finance require a cookie (header) and a crumb (query param).
  const { cookie, crumb } = await cookieCrumb(false, signal);

  try {
    return await request<T>(path, { ...params, crumb }, cookie, signal);
  } catch (error) {
    console.log("yahoo-finance: request failed", error);
    if (error instanceof YahooFinanceError && (error.status === 401 || error.status === 403)) {
      console.log("yahoo-finance: cookie expired or invalid crumb, fetching new cookie and crumb");
      const refreshed = await cookieCrumb(true, signal);
      return await request<T>(path, { ...params, crumb: refreshed.crumb }, refreshed.cookie, signal);
    }
    throw error;
  }
}

async function request<T>(
  path: string,
  params: { [key: string]: string },
  cookie: string,
  signal: AbortSignal,
): Promise<T> {
  const url = new URL(path, "https://query1.finance.yahoo.com");
  for (const key in params) {
    url.searchParams.append(key, params[key]);
  }

  const response = await fetch(url.toString(), {
    headers: { cookie, ...HEADERS },
    signal,
  });
  if (response.status !== 200) {
    throw new YahooFinanceError(response);
  }
  return (await response.json()) as T;
}

class YahooFinanceError extends Error {
  status: number;

  constructor(response: Response) {
    super(`Error reaching Yahoo Finance: ${response.status} ${response.statusText}`);
    this.status = response.status;
  }
}

interface CookieCrumb {
  cookie: string;
  crumb: string;
  fetchedAt: number;
}

// Yahoo cookies expire after roughly a day. Refresh proactively so the first request after a long-idle
// session doesn't have to fail-and-retry just to learn the cookie is stale.
const COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

function isCookieCrumb(value: unknown): value is CookieCrumb {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as CookieCrumb).cookie === "string" &&
    typeof (value as CookieCrumb).crumb === "string" &&
    typeof (value as CookieCrumb).fetchedAt === "number"
  );
}

// Get a cookie and crumb from Yahoo Finance, caching the result in local storage.
export async function cookieCrumb(ignoreExisting: boolean, signal: AbortSignal): Promise<CookieCrumb> {
  if (!ignoreExisting) {
    const value = await LocalStorage.getItem<string>(COOKIE_CRUMB_KEY);
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (isCookieCrumb(parsed)) {
          if (Date.now() - parsed.fetchedAt < COOKIE_MAX_AGE_MS) {
            return parsed;
          }
          console.log("yahoo-finance: cached cookie/crumb expired, refetching");
        } else {
          console.warn("yahoo-finance: cached cookie/crumb has unexpected shape, refetching");
        }
      } catch (e) {
        console.warn("yahoo-finance: failed to parse cached cookie/crumb, refetching", e);
      }
      await LocalStorage.removeItem(COOKIE_CRUMB_KEY);
    }
  }

  console.log("yahoo-finance: fetching new cookie");
  const cookie = await getCookie(signal);
  const crumb = await getCrumb(cookie, signal);

  const cached: CookieCrumb = { cookie, crumb, fetchedAt: Date.now() };
  await LocalStorage.setItem(COOKIE_CRUMB_KEY, JSON.stringify(cached));
  return cached;
}

async function getCookie(signal: AbortSignal): Promise<string> {
  const response = await fetch("https://fc.yahoo.com", { headers: HEADERS, signal });
  // `headers.get("set-cookie")` joins multiple Set-Cookie values with commas, which is invalid for a Cookie request
  // header. Use getSetCookie() (Node 18.18+) and turn each entry into a name=value pair joined with "; ".
  const setCookies = response.headers.getSetCookie?.() ?? [];
  const cookie = setCookies
    .map((c) => c.split(";")[0].trim())
    .filter((c) => c.length > 0)
    .join("; ");
  if (!cookie) {
    throw new Error("Failed to fetch cookie");
  }
  return cookie;
}

async function getCrumb(cookie: string, signal: AbortSignal): Promise<string> {
  const response = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { cookie, ...HEADERS },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch crumb: ${response.status} ${response.statusText}`);
  }
  const crumb = await response.text();
  if (!crumb) {
    throw new Error("Failed to fetch crumb");
  }
  return crumb;
}

export default {
  get,
};
