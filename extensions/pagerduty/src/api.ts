import { getPreferenceValues } from "@raycast/api";
import { ErrorResponse, GetMeError } from "./types";

const { apiKey } = getPreferenceValues<{ apiKey: string }>();

export const API_URL = "https://api.pagerduty.com";
export const API_HEADERS = {
  Authorization: `Token token=${apiKey}`,
};
export const PAGE_LIMIT = "25";

const makeRequest = async <T>(endpoint: string, options?: RequestInit) => {
  const response = await fetch(API_URL + endpoint, {
    ...options,
    headers: {
      ...API_HEADERS,
      ...options?.headers,
    },
  });
  if (!response.headers.get("Content-Type")?.includes("json")) throw new Error(await response.text());
  const result = await response.json();
  if (!response.ok) {
    const err = result as ErrorResponse | GetMeError;
    if (typeof err.error === "string") throw new Error(err.error);
    if (err.error && typeof err.error === "object" && "message" in err.error) {
      const errorMsg = err.error.errors?.length ? ` reason: ${err.error.errors.join(", ")}` : "";
      throw new Error(`${err.error.message}${errorMsg}`);
    }
    throw new Error(`Request failed: ${JSON.stringify(result)}`);
  }
  return result as T;
};

export const pagerDutyClient = {
  get: <T>(endpoint: string) => makeRequest<T>(endpoint),
  post: <T>(endpoint: string, options: RequestInit) =>
    makeRequest<T>(endpoint, {
      ...options,
      method: "POST",
      headers: { "Content-Type": "application/json", ...options?.headers },
    }),
  put: <T>(endpoint: string, options: RequestInit) =>
    makeRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      headers: { "Content-Type": "application/json", ...options?.headers },
    }),
};
