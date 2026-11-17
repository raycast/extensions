import { getPreferenceValues } from "@raycast/api";

export const API_BASE = "https://api.public.ninety.io/v1";

export class NinetyError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "NinetyError";
  }
}

/**
 * The only place the extension reads credentials. Ninety's public API supports Personal Access
 * Tokens only; if OAuth is added later, swap this for a Raycast OAuth.PKCEClient token.
 */
export function getToken(): string {
  const { apiToken } = getPreferenceValues<Preferences>();
  return (apiToken ?? "").trim().replace(/^Bearer\s+/i, "");
}

type QueryValue = string | number | boolean | undefined | null;

interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function friendlyMessage(status: number, serverMessage: string | undefined): string {
  switch (status) {
    case 401:
      return "Your Ninety token is missing, invalid or expired. Update it in the extension preferences.";
    case 403:
      return serverMessage
        ? `Ninety denied this request: ${serverMessage}`
        : "Ninety denied this request. Your role or plan may not allow it.";
    case 404:
      return serverMessage ?? "Not found in Ninety.";
    case 429:
      return "Too many requests to Ninety. Wait a moment and try again.";
    default:
      return serverMessage ?? `Ninety returned an error (${status}).`;
  }
}

function extractMessage(text: string): string | undefined {
  if (!text) return undefined;
  try {
    const json = JSON.parse(text) as { message?: unknown; error?: unknown };
    const message = json.message ?? json.error;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  } catch {
    // Not JSON
  }
  return text.length < 300 ? text : undefined;
}

export async function request<T>(method: string, path: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const url = new URL(API_BASE + path);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const hasBody = options.body !== undefined;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: "application/json",
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    body: hasBody ? JSON.stringify(options.body) : undefined,
  });

  // Ninety allows 25 requests/second per user and resets every second.
  if (response.status === 429 && retry) {
    await sleep(1100);
    return request<T>(method, path, options, false);
  }

  const text = await response.text();
  if (!response.ok) {
    throw new NinetyError(response.status, friendlyMessage(response.status, extractMessage(text)));
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) => request<T>("GET", path, { query }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body: body ?? {} }),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, { body }),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
};
