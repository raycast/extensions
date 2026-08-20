import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { environment } from "@raycast/api";

/**
 * Optional overrides for pointing development builds at a local backend
 * (Supabase CLI Docker stack). Any field left out falls back to the
 * production value in {@link ../constants}.
 */
type LocalBackendConfig = {
  supabaseUrl?: string;
  supabasePublishableKey?: string;
};

const LOCAL_CONFIG_PATH = join(environment.assetsPath, "local-config.json");

/**
 * Loads local backend overrides from `assets/local-config.json`.
 *
 * The file is gitignored, so it never ships with store submissions; installed
 * extensions and machines without the file always use production. Only
 * development commands (`npm run dev`) read it.
 *
 * @returns The parsed overrides, or an empty object when the file is absent,
 *   unreadable, or the extension is not running in development mode
 */
export const loadLocalBackendConfig = (): LocalBackendConfig => {
  if (!environment.isDevelopment || !existsSync(LOCAL_CONFIG_PATH)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(LOCAL_CONFIG_PATH, "utf8")) as LocalBackendConfig;
  } catch {
    return {};
  }
};
