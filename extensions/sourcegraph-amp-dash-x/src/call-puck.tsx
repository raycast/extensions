import { execFile } from "node:child_process";
import { open, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { AMP_URL } from "./lib/amp";

/** Runs the "Call Puck" shortcut that the Amp Mac app adds to the Shortcuts app. */
export default async function CallPuck() {
  const ok = await new Promise<boolean>((resolve) =>
    execFile("/usr/bin/shortcuts", ["run", "Call Puck"], { timeout: 15_000 }, (error) => resolve(!error)),
  );
  if (ok) {
    await showHUD("Calling Puck…");
    return;
  }
  // Without the Mac app, calls still work on ampcode.com (Ctrl+Shift+/).
  try {
    await open(AMP_URL);
    await showHUD("Amp for Mac not found — press ⌃⇧/ on ampcode.com to call Puck");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't open ampcode.com" });
  }
}
