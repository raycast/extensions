import { environment, getPreferenceValues } from "@raycast/api";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { syncPreferences } from "../core/config";
import { installCli } from "../core/install";
import { CLI_PATH } from "../core/paths";
import { Config } from "../core/types";

/** Mirror native preferences for the hook CLI and background collector. */
export function syncConfig(): Config {
  return syncPreferences(
    getPreferenceValues<Preferences>(),
    `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}`,
  );
}

/** Once hooks are connected, keep ~/.sessions/bin/agent-inbox.mjs in step with the extension version. */
function refreshCli() {
  try {
    const bundled = join(environment.assetsPath, "agent-inbox.mjs");
    if (existsSync(CLI_PATH) && existsSync(bundled)) installCli(bundled);
  } catch {
    // best effort
  }
}

let refreshed = false;

export function extensionConfig(): Config {
  const config = syncConfig();
  if (!refreshed) {
    refreshed = true;
    refreshCli();
  }
  return config;
}
