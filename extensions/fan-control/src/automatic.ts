import { showHUD } from "@raycast/api";
import { applyFanProfile } from "./lib/smctl";

export default async function Command() {
  try {
    await applyFanProfile("auto");
    await showHUD("✅ Fans returned to macOS automatic control");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showHUD(`❌ Automatic mode failed: ${message}`);
  }
}
