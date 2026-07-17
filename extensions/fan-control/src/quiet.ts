import { showHUD } from "@raycast/api";
import { applyFanProfile } from "./lib/smctl";

export default async function Command() {
  try {
    await applyFanProfile("quiet");
    await showHUD("🌙 Quiet fan curve applied");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(`❌ Quiet mode failed: ${message}`);
  }
}
