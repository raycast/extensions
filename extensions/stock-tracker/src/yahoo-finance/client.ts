import { LocalStorage } from "@raycast/api";
import fetch from "cross-fetch";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36",
} as const;

export async function get<T>(path: string, params: { [key: string]: string }, signal: AbortSignal): Promise<T> {
  // Requests to Yahoo Finance require a cookie (header) and a crumb (query param).
  const { cookie, crumb } = await cookieCrumb();

  try {
    return await request<T>(path, { ...params, crumb }, cookie, signal);
  } catch (error) {
    console.log("yahoo-finance: request failed", error);
    if (error instanceof YahooFinanceError && error.status === 401) {
      console.log("yahoo-finance: cookie expired, fetching new cookie");
      const { cookie, crumb } = await cookieCrumb();
      return await request<T>(path, { ...params, crumb }, cookie, signal);
    }
    throw error;
  }
}

async function request<T>(
  path: string,
  params: { [key: string]: string },
  cookie: string,
  signal: AbortSignal
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
}

// Get a cookie and crumb from Yahoo Finance, caching the result in local storage.
export async function cookieCrumb(): Promise<CookieCrumb> {
  const value = await LocalStorage.getItem<string>("yahoo-cookie-crumb");
  if (value) {
    return JSON.parse(value);
  }

  console.log("yahoo-finance: fetching new cookie");
  const cookie = await getCookie();
  const crumb = await getCrumb(cookie);

  await LocalStorage.setItem("yahoo-cookie-crumb", JSON.stringify({ cookie, crumb }));
  return { cookie, crumb };
}

async function getCookie(): Promise<string> {
  const response = await fetch("https://fc.yahoo.com", { headers: HEADERS });
  const cookie = response.headers.get("set-cookie");
  if (!cookie) {
    throw new Error("Failed to fetch cookie");
  }
  return cookie;
}

async function getCrumb(cookie: string): Promise<string> {
  const response = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: { cookie, ...HEADERS },
  });
  const crumb = await response.text();
  if (!crumb) {
    throw new Error("Failed to fetch crumb");
  }
  return crumb;
}

export default {
  get,
};
