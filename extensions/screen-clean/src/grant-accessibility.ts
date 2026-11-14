import { Clipboard, open, showHUD } from "@raycast/api";
import { spawnSync } from "node:child_process";
import { ensureHelper, helperPath } from "./lib/screen-cleaner";

const ACCESSIBILITY_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

export default async function main() {
  if (process.platform !== "darwin") {
    await showHUD("No extra permission is needed on Windows — strict lock uses a keyboard hook");
    return;
  }

  try {
    ensureHelper();
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : "ScreenCleaner helper is missing");
    return;
  }

  const result = spawnSync(helperPath, ["--request-accessibility"], {
    stdio: "ignore",
    timeout: 10_000,
  });

  if (result.status === 0) {
    await showHUD("Keyboard lock permission is already granted");
    return;
  }

  await open(ACCESSIBILITY_SETTINGS);
  await Clipboard.copy(helperPath);
  await showHUD("Enable ScreenCleaner under Accessibility. Its path was copied — use + if it is not listed.");
}
