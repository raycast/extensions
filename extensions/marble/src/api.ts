import { getPreferenceValues, Cache } from "@raycast/api";

export const BASE_URL = "https://api.marblecms.com/v1";

const cache = new Cache({ namespace: "marble" });

export function getHeaders(): Record<string, string> {
  const { apiKey } = getPreferenceValues<ExtensionPreferences>();
  return {
    Authorization: apiKey,
    "Content-Type": "application/json",
  };
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractError(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const err = (body as Record<string, unknown>).error;
    if (typeof err === "string") return err;
    if (typeof err === "object" && err !== null && "message" in err) {
      return String((err as Record<string, unknown>).message);
    }
    return JSON.stringify(err);
  }
  return fallback;
}

export function getCached<T>(key: string): T | undefined {
  const raw = cache.get(key);
  return raw ? JSON.parse(raw) : undefined;
}

export function setCache(key: string, data: unknown): void {
  cache.set(key, JSON.stringify(data));
}
