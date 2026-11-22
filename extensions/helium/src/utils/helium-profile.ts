import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { getWindowsUserDataPath, isWindows } from "./platform";

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

/**
 * Root of Helium's Chromium user data, which holds `Local State` and the
 * profile directories. Both platforms use the standard Chromium layout below
 * this path, so only the root differs.
 */
export function getHeliumBasePath(home = homedir()): string {
  if (isWindows) return getWindowsUserDataPath() ?? join(home, "AppData", "Local", "imput", "Helium", "User Data");
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

  // Chromium records the profile the user last had focused in `last_used`;
  // check it first so multi-profile setups read from the intended profile.
  const lastUsed = getString(profile?.last_used);
  if (lastUsed) profileNames.add(lastUsed);

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

/**
 * Resolve the search engine selected in Helium's settings.
 *
 * 1. Engine data stored in `Preferences` (see
 *    {@link getDefaultSearchProviderFromPreferences}), which needs no database read.
 * 2. The `Web Data` keyword whose `sync_guid` matches the selected engine's
 *    `default_search_provider.guid`.
 * 3. Helium's own default, DuckDuckGo, when no engine was ever selected.
 */
export async function getHeliumSearchEngine(basePath = getHeliumBasePath()): Promise<HeliumSearchEngine> {
  const preferences = readJsonFile(findProfileFile("Preferences", basePath));
  const fromPreferences = getDefaultSearchProviderFromPreferences(preferences);
  if (fromPreferences) return fromPreferences;

  const webDataPath = findProfileFile("Web Data", basePath);
  if (!webDataPath) return FALLBACK_SEARCH_ENGINE;

  const guid = getDefaultSearchProviderGuid(preferences);

  try {
    const { executeSQL } = await import("@raycast/utils");
    const rows = await executeSQL<KeywordRow>(webDataPath, getSearchEngineQuery(guid));
    const engine = rowToSearchEngine(rows[0]);
    if (guid && !engine) {
      console.error(`[Helium] Selected search engine ${guid} not found in Web Data; falling back to DuckDuckGo`);
    }
    return engine ?? FALLBACK_SEARCH_ENGINE;
  } catch (error) {
    console.error("[Helium] Failed to read search engines:", error);
    return FALLBACK_SEARCH_ENGINE;
  }
}

/**
 * SQL for the selected engine's `Web Data` keyword row, or Helium's default
 * (DuckDuckGo, prepopulate id 92) when no engine is selected.
 */
export function getSearchEngineQuery(guid: string | undefined): string {
  const columns = `
    SELECT
      short_name AS name,
      keyword,
      url AS searchUrl,
      suggest_url AS suggestionsUrl
    FROM keywords`;

  // GUIDs are validated before use, so interpolating is safe here.
  if (guid) {
    return `${columns}
    WHERE sync_guid = '${guid}'
    LIMIT 1;`;
  }

  return `${columns}
    WHERE prepopulate_id = 92 OR keyword = 'duckduckgo.com'
    ORDER BY prepopulate_id = 92 DESC
    LIMIT 1;`;
}

/** The selected engine's GUID from `default_search_provider.guid`, if it looks valid. */
export function getDefaultSearchProviderGuid(preferences: unknown): string | undefined {
  const guid = getString(getRecord(getRecord(preferences)?.default_search_provider)?.guid);
  return guid && /^[0-9a-f-]{8,64}$/i.test(guid) ? guid : undefined;
}

/**
 * Engine data Chromium keeps in `Preferences`, most specific first:
 *
 * - `default_search_provider` with an explicit `search_url` (managed/legacy layout)
 * - `default_search_provider_data.template_url_data` (a user-chosen engine)
 * - `default_search_provider_data.mirrored_template_url_data` (Chromium's mirror
 *   of the current default, present on most profiles)
 *
 * Returns `undefined` when none holds a usable `{searchTerms}` URL.
 */
export function getDefaultSearchProviderFromPreferences(preferences: unknown): HeliumSearchEngine | undefined {
  const root = getRecord(preferences);
  const providerData = getRecord(root?.default_search_provider_data);

  return (
    templateToSearchEngine(getRecord(root?.default_search_provider), "search_url", "suggest_url") ??
    templateToSearchEngine(getRecord(providerData?.template_url_data), "url", "suggestions_url") ??
    templateToSearchEngine(getRecord(providerData?.mirrored_template_url_data), "url", "suggestions_url")
  );
}

function templateToSearchEngine(
  template: Record<string, unknown> | undefined,
  searchUrlKey: string,
  suggestionsUrlKey: string,
): HeliumSearchEngine | undefined {
  if (!template) return undefined;

  const searchUrl = getString(template[searchUrlKey]);
  if (!searchUrl || !searchUrl.includes("{searchTerms}")) return undefined;

  const name = getString(template.short_name) ?? getString(template.name);
  const keyword = getString(template.keyword) ?? "";
  const suggestionsUrl = getString(template[suggestionsUrlKey]) || undefined;

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
