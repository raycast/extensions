import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export interface HeliumServicesPreferences {
  enabled: boolean;
  bangs: boolean;
  origin: string;
}

export interface HeliumSearchEngine {
  name: string;
  keyword: string;
  searchUrl: string;
  suggestionsUrl?: string;
}

interface KeywordRow {
  name: string;
  keyword: string;
  searchUrl: string;
  suggestionsUrl?: string;
}

const HELIUM_SUPPORT_PATH = join("Library", "Application Support", "net.imput.helium");
const DEFAULT_SERVICES_ORIGIN = "https://services.helium.imput.net";

export const FALLBACK_SEARCH_ENGINE: HeliumSearchEngine = {
  name: "DuckDuckGo",
  keyword: "duckduckgo.com",
  searchUrl: "https://duckduckgo.com/?q={searchTerms}",
  suggestionsUrl: "https://duckduckgo.com/ac/?q={searchTerms}&type=list",
};

export function getHeliumBasePath(home = homedir()): string {
  return join(home, HELIUM_SUPPORT_PATH);
}

export function findProfileFile(fileName: string, basePath = getHeliumBasePath()): string | undefined {
  for (const profileName of getCandidateProfileNames(basePath)) {
    const candidate = join(basePath, profileName, fileName);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

export function getCandidateProfileNames(basePath = getHeliumBasePath()): string[] {
  const profileNames = new Set<string>();
  const localState = readJsonFile(join(basePath, "Local State"));
  const profile = getRecord(getRecord(localState)?.profile);

  for (const profileName of getStringArray(profile?.last_active_profiles)) {
    profileNames.add(profileName);
  }

  const infoCache = getRecord(profile?.info_cache);
  if (infoCache) {
    for (const profileName of Object.keys(infoCache)) profileNames.add(profileName);
  }

  profileNames.add("Default");

  try {
    for (const entry of readdirSync(basePath)) {
      const profilePath = join(basePath, entry);
      if (statSync(profilePath).isDirectory() && existsSync(join(profilePath, "Preferences"))) {
        profileNames.add(entry);
      }
    }
  } catch {
    // Missing profile data is handled by the caller's fallback path.
  }

  return [...profileNames];
}

export function findHistoryDatabasePath(basePath = getHeliumBasePath()): string | undefined {
  return findProfileFile("History", basePath);
}

export function getHeliumServicesPreferences(basePath = getHeliumBasePath()): HeliumServicesPreferences {
  const preferences = readJsonFile(findProfileFile("Preferences", basePath));
  return getHeliumServicesPreferencesFromJson(preferences);
}

export function getHeliumServicesPreferencesFromJson(preferences: unknown): HeliumServicesPreferences {
  const services = getRecord(getRecord(preferences)?.helium)?.services;
  const servicePrefs = getRecord(services);
  const enabled = typeof servicePrefs?.enabled === "boolean" ? servicePrefs.enabled : true;
  const bangs = typeof servicePrefs?.bangs === "boolean" ? servicePrefs.bangs : true;
  const originOverride = typeof servicePrefs?.origin_override === "string" ? servicePrefs.origin_override : "";
  const origin = getValidServicesOrigin(originOverride) ?? DEFAULT_SERVICES_ORIGIN;

  return { enabled, bangs, origin };
}

export async function getHeliumSearchEngine(basePath = getHeliumBasePath()): Promise<HeliumSearchEngine> {
  const preferences = readJsonFile(findProfileFile("Preferences", basePath));
  const explicit = getDefaultSearchProviderFromPreferences(preferences);
  if (explicit) return explicit;

  const webDataPath = findProfileFile("Web Data", basePath);
  if (!webDataPath) return FALLBACK_SEARCH_ENGINE;

  try {
    const { executeSQL } = await import("@raycast/utils");
    const rows = await executeSQL<KeywordRow>(
      webDataPath,
      `
        SELECT
          short_name AS name,
          keyword,
          url AS searchUrl,
          suggest_url AS suggestionsUrl
        FROM keywords
        WHERE prepopulate_id = 92 OR keyword = 'duckduckgo.com'
        ORDER BY prepopulate_id = 92 DESC
        LIMIT 1;
      `,
    );
    return rowToSearchEngine(rows[0]) ?? FALLBACK_SEARCH_ENGINE;
  } catch (error) {
    console.error("[Helium] Failed to read search engines:", error);
    return FALLBACK_SEARCH_ENGINE;
  }
}

export function getDefaultSearchProviderFromPreferences(preferences: unknown): HeliumSearchEngine | undefined {
  const defaultSearchProvider = getRecord(getRecord(preferences)?.default_search_provider);
  if (!defaultSearchProvider) return undefined;

  const searchUrl = getString(defaultSearchProvider.search_url);
  const name = getString(defaultSearchProvider.short_name) ?? getString(defaultSearchProvider.name);
  const keyword = getString(defaultSearchProvider.keyword) ?? "";
  const suggestionsUrl = getString(defaultSearchProvider.suggest_url);

  if (!searchUrl || !searchUrl.includes("{searchTerms}")) return undefined;

  return {
    name: name || keyword || "Helium Search",
    keyword,
    searchUrl,
    suggestionsUrl,
  };
}

function rowToSearchEngine(row: KeywordRow | undefined): HeliumSearchEngine | undefined {
  if (!row?.searchUrl) return undefined;
  return {
    name: row.name || row.keyword || "Helium Search",
    keyword: row.keyword,
    searchUrl: row.searchUrl,
    suggestionsUrl: row.suggestionsUrl || undefined,
  };
}

function getValidServicesOrigin(origin: string): string | undefined {
  if (!origin) return undefined;

  try {
    const parsed = new URL(origin);
    if (parsed.protocol === "https:" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      return parsed.origin;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function readJsonFile(path: string | undefined): unknown {
  if (!path || !existsSync(path)) return undefined;

  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function getRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
