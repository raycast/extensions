import { showToast } from "@raycast/api";
import { checkAndInstallDNDShortcuts } from "../lib/focus";

export default async function CheckAndInstallPomodoroDNDShortcut() {
  if (await checkAndInstallDNDShortcuts()) {
    await showToast({ title: "Already installed" });
  }
}
