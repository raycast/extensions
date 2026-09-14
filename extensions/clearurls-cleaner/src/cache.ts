import { Cache, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { ClearUrlsData } from "./types";

const CACHE_KEY = "clearurls-rules";
const CACHE_TTL = 24 * 60 * 60 * 1000;
const RULES_URL =
  "https://raw.githubusercontent.com/ClearURLs/Rules/refs/heads/master/data.min.json";

export async function getRules(): Promise<ClearUrlsData> {
  const cache = new Cache();
  const cached = cache.get(CACHE_KEY);

  let staleData: ClearUrlsData | undefined;

  if (cached) {
    try {
      const parsed = JSON.parse(cached) as {
        timestamp: number;
        data: ClearUrlsData;
      };
      staleData = parsed.data;
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        return parsed.data;
      }
    } catch {
      // ignore invalid cache
    }
  }

  try {
    const data = await fetchRules();
    cache.set(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }));
    return data;
  } catch (error) {
    if (staleData) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not refresh rules",
        message: "Using cached rules instead",
      });
      return staleData;
    }
    throw error;
  }
}

export async function fetchRules(): Promise<ClearUrlsData> {
  const { rulesUrl } = getPreferenceValues<Preferences>();
  const url = (rulesUrl as string | undefined) || RULES_URL;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch rules: ${response.statusText}`);
  }

  const text = await response.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Failed to parse rules JSON");
  }

  if (!isValidClearUrlsData(data)) {
    throw new Error("Invalid ClearURLs rules format");
  }

  return data;
}

function isValidClearUrlsData(data: unknown): data is ClearUrlsData {
  if (typeof data !== "object" || data === null) return false;
  const { providers } = data as Record<string, unknown>;
  if (typeof providers !== "object" || providers === null) return false;
  return Object.values(providers).every(isValidProvider);
}

function isValidProvider(provider: unknown): boolean {
  if (typeof provider !== "object" || provider === null) return false;
  const p = provider as Record<string, unknown>;
  if (typeof p.urlPattern !== "string") return false;
  if (
    p.completeProvider !== undefined &&
    typeof p.completeProvider !== "boolean"
  )
    return false;
  if (p.rules !== undefined && !isStringArray(p.rules)) return false;
  if (p.referralMarketing !== undefined && !isStringArray(p.referralMarketing))
    return false;
  if (p.exceptions !== undefined && !isStringArray(p.exceptions)) return false;
  if (p.redirections !== undefined && !isStringArray(p.redirections))
    return false;
  if (p.forceRedirection !== undefined && !isStringArray(p.forceRedirection))
    return false;
  return true;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}
