import { environment, getPreferenceValues } from "@raycast/api";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ExtensionPreferences, syncPreferences } from "../core/config";
import { installCli } from "../core/install";
import { CLI_PATH } from "../core/paths";
import { translator, Translator } from "../core/messages";
import { Config } from "../core/types";

/** Mirror native preferences for the hook CLI and background collector. */
export function syncConfig(): Config {
  return syncPreferences(
    getPreferenceValues<ExtensionPreferences>(),
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

export function locale(): { t: Translator; config: Config } {
  const config = syncConfig();
  if (!refreshed) {
    refreshed = true;
    refreshCli();
  }
  return { t: translator(), config };
}
