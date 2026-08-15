import { showHUD } from "@raycast/api";

import { getPreferences } from "./lib/preferences";
import { inspectRimeInstallation, runSquirrelAction } from "./lib/rime";

export default async function Command() {
  try {
    const installation = await inspectRimeInstallation(getPreferences());
    await runSquirrelAction(installation, "sync");
    await showHUD("✓ Rime user data synced");
  } catch (error) {
    await showHUD(`✕ Sync failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
