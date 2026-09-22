import { environment, getPreferenceValues } from "@raycast/api";
import { join } from "node:path";
import { defaultClaudeProjectsDir, defaultCodexHome, IndexConfig, setConfig } from "./config";

/** Build the index configuration from Raycast preferences and register it for this process. */
export function configureFromPreferences(): IndexConfig {
  const p = getPreferenceValues<Preferences>();
  const cfg: IndexConfig = {
    dbPath: join(environment.supportPath, "sessions-index.sqlite"),
    claudeProjectsDir: defaultClaudeProjectsDir(p.claudeConfigDir),
    codexHome: defaultCodexHome(p.codexHome),
    includeArchived: p.includeArchived !== false,
  };
  setConfig(cfg);
  return cfg;
}
