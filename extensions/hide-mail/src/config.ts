import { environment, getPreferenceValues } from "@raycast/api";

/** Bump together with every CHANGELOG entry: the API records it to see which versions are in use */
export const EXTENSION_VERSION = "1.2.0";

const DEFAULT_HOST = "https://hidemail.app";

export const getHost = (): string => {
  const host = (getPreferenceValues<Preferences>().host ?? "").trim().replace(/\/+$/, "");

  if (host === "") {
    return DEFAULT_HOST;
  }

  const url = new URL(/^https?:\/\//.test(host) ? host : `https://${host}`);

  // The API key is sent as a bearer token, so plain HTTP is only allowed for local development hosts
  if (url.protocol === "http:" && !isLocalHostname(url.hostname)) {
    url.protocol = "https:";
  }

  return url.origin;
};

const isLocalHostname = (hostname: string): boolean =>
  ["localhost", "127.0.0.1", "[::1]"].includes(hostname) || /\.(test|localhost)$/.test(hostname);

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
