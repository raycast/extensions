import { togglApiToken } from "@/helpers/preferences";

const base64encode = (str: string) => {
  return Buffer.from(str).toString("base64");
};

const baseUrl = "https://api.track.toggl.com/api/v9";
const authHeader = { Authorization: `Basic ${base64encode(`${togglApiToken}:api_token`)}` };

export const get = <T>(endpoint: string) => togglFetch<T>("GET", endpoint);
export const post = <T = void>(endpoint: string, body?: unknown) => togglFetch<T>("POST", endpoint, body);
export const patch = <T = void>(endpoint: string, body?: unknown) => togglFetch<T>("PATCH", endpoint, body);
export const put = <T = void>(endpoint: string, body?: unknown) => togglFetch<T>("PUT", endpoint, body);
export const remove = (endpoint: string) => togglFetch("DELETE", endpoint);

const RATE_LIMIT_DELAYS = [1000, 5000, 15000];

async function togglFetch<T>(method: string, endpoint: string, body?: unknown): Promise<T>;
async function togglFetch(method: "DELETE", endpoint: string): Promise<void>;
async function togglFetch<T>(method: string, endpoint: string, body?: unknown): Promise<T | void> {
  return togglFetchWithRetry(method, endpoint, body, 0);
}

async function togglFetchWithRetry<T>(
  method: string,
  endpoint: string,
  body: unknown | undefined,
  retryCount: number,
): Promise<T | void> {
  const headers: Record<string, string> = authHeader;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(baseUrl + endpoint, {
    method: method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 402) {
      throw new Error("Hourly API quota exhausted — try again later");
    }
    if (res.status === 429) {
      if (retryCount >= RATE_LIMIT_DELAYS.length) {
        throw new Error("Rate limited — try again in a few minutes");
      }
      await delay(RATE_LIMIT_DELAYS[retryCount]);
      return await togglFetchWithRetry(method, endpoint, body, retryCount + 1);
    }
    let msg = `${res.status} ${res.statusText}`;
    const text = (await res.text()) as string;
    if (text) msg += ", " + text;
    throw new Error(msg);
  }
  try {
    const json = (await res.json()) as T | null;
    if (json !== null) return json;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
