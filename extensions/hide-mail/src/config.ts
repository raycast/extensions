import { environment, getPreferenceValues } from "@raycast/api";

/** Bump together with every CHANGELOG entry: the API records it to see which versions are in use */
export const EXTENSION_VERSION = "1.2.0";

const DEFAULT_HOST = "https://hidemail.app";

export const getHost = (): string => {
  const host = (getPreferenceValues<Preferences>().host ?? "").trim().replace(/\/+$/, "");

  if (host === "") {
    return DEFAULT_HOST;
  }

  // The API key is sent as a bearer token, so always use HTTPS whatever scheme was entered
  return new URL(`https://${host.replace(/^https?:\/\//i, "")}`).origin;
};

export const getApiUrl = (): string => `${getHost()}/api/v1`;

export const getWebUrl = (path: string): string => `${getHost()}${path}?source=raycast`;

export const getHeaders = (token: string) => {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Custom-Agent": "Raycast",
    "X-Custom-Agent-Version": EXTENSION_VERSION,
    "X-Custom-Agent-Host-Version": environment.raycastVersion,
  };
};
