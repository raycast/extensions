import { showHUD } from "@raycast/api";

import { getPreferences } from "./lib/preferences";
import { inspectRimeInstallation, runSquirrelAction } from "./lib/rime";

export default async function Command() {
  try {
    const installation = await inspectRimeInstallation(getPreferences());
    await runSquirrelAction(installation, "reload");
    await showHUD("✓ Rime deployed");
  } catch (error) {
    await showHUD(`✕ Deployment failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
