import { LocalStorage } from "@raycast/api";

const BASE_URL = "https://query1.finance.yahoo.com";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; Raycast Stock Charts)",
} as const;
const COOKIE_CRUMB_KEY = "yahoo-cookie-crumb";
const COOKIE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export class YahooFinanceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "YahooFinanceError";
  }
}

interface CookieCrumb {
  cookie: string;
  crumb: string;
  fetchedAt: number;
}

async function getCookie(): Promise<string> {
  const res = await fetch("https://fc.yahoo.com", {
    headers: HEADERS,
    redirect: "manual",
  });
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) {
    throw new YahooFinanceError("No Set-Cookie header from Yahoo", 0);
  }
  return setCookie.split(";")[0];
}

async function getCrumb(cookie: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/v1/test/getcrumb`, {
    headers: { ...HEADERS, Cookie: cookie },
  });
  if (!res.ok) {
    throw new YahooFinanceError(
      `Failed to get crumb: ${res.status}`,
      res.status,
    );
  }
  const crumb = await res.text();
  if (!crumb || crumb.includes("<")) {
    throw new YahooFinanceError("Invalid crumb response", 0);
  }
  return crumb;
}

async function cookieCrumb(): Promise<CookieCrumb> {
  const cached = await LocalStorage.getItem<string>(COOKIE_CRUMB_KEY);
  if (cached) {
    const parsed: CookieCrumb = JSON.parse(cached);
    if (Date.now() - parsed.fetchedAt < COOKIE_MAX_AGE_MS) {
      return parsed;
    }
  }
  return refreshCookieCrumb();
}

async function refreshCookieCrumb(): Promise<CookieCrumb> {
  const cookie = await getCookie();
  const crumb = await getCrumb(cookie);
  const entry: CookieCrumb = { cookie, crumb, fetchedAt: Date.now() };
  await LocalStorage.setItem(COOKIE_CRUMB_KEY, JSON.stringify(entry));
  return entry;
}

export async function get<T>(
  path: string,
  params: Record<string, string> = {},
  signal?: AbortSignal,
): Promise<T> {
  let cc = await cookieCrumb();

  const attempt = async (): Promise<T> => {
    const url = new URL(`${BASE_URL}${path}`);
    url.searchParams.set("crumb", cc.crumb);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), {
      headers: { ...HEADERS, Cookie: cc.cookie },
      signal,
    });

    if (!res.ok) {
      throw new YahooFinanceError(
        `Yahoo Finance ${res.status}: ${path}`,
        res.status,
      );
    }

    return (await res.json()) as T;
  };

  try {
    return await attempt();
  } catch (e) {
    if (
      e instanceof YahooFinanceError &&
      (e.status === 401 || e.status === 403)
    ) {
      cc = await refreshCookieCrumb();
      return await attempt();
    }
    throw e;
  }
}
