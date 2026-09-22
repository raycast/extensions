import { environment, getPreferenceValues } from "@raycast/api";
import { join } from "node:path";
import { AGENTS } from "./agents";
import { IndexConfig, setConfig } from "./config";

/** Build the index configuration from Raycast preferences and register it for this process. */
export function configureFromPreferences(): IndexConfig {
  const p = getPreferenceValues<Preferences>() as Record<string, unknown>;
  const homes: Record<string, string> = {};
  for (const a of AGENTS) {
    const override = a.homePreference ? p[a.homePreference] : undefined;
    homes[a.id] = a.home(typeof override === "string" ? override : undefined);
  }
  const cfg: IndexConfig = {
    dbPath: join(environment.supportPath, "sessions-index.sqlite"),
    homes,
    includeArchived: p.includeArchived !== false,
  };
  setConfig(cfg);
  return cfg;
}
