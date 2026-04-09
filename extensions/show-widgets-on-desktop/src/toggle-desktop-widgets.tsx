import { showToast, Toast } from "@raycast/api";
import { execFileSync } from "node:child_process";

const DOMAIN = "com.apple.WindowManager";
/** When true, widgets are hidden on the standard desktop (not Stage Manager). */
const KEY = "StandardHideWidgets";

function readStandardHideWidgets(): boolean {
  try {
    const out = execFileSync("defaults", ["read", DOMAIN, KEY], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return /^(1|true|yes)$/i.test(out);
  } catch {
    return false;
  }
}

function writeStandardHideWidgets(hide: boolean): void {
  execFileSync("defaults", ["write", DOMAIN, KEY, "-bool", hide ? "true" : "false"]);
}

export default async function Command() {
  try {
    const wasHidden = readStandardHideWidgets();
    const nowHidden = !wasHidden;
    writeStandardHideWidgets(nowHidden);
    await showToast({
      style: Toast.Style.Success,
      title: nowHidden ? "Widgets hidden from desktop" : "Widgets shown on desktop",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not toggle desktop widgets",
      message,
    });
  }
}
