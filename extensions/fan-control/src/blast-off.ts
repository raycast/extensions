import { showHUD } from "@raycast/api";
import { applyFanProfile } from "./lib/smctl";

export default async function Command() {
  try {
    await applyFanProfile("full");
    await showHUD("🚀 Blast Off — fans at maximum");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(`❌ Blast Off failed: ${message}`);
  }
}
