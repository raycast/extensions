import { getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { saveWithFeedback } from "./save-feedback";

const BROWSERS = new Map([
  ["com.apple.Safari", "current tab"],
  ["com.apple.SafariTechnologyPreview", "current tab"],
  ["com.google.Chrome", "active tab"],
  ["com.google.Chrome.canary", "active tab"],
  ["com.brave.Browser", "active tab"],
  ["com.microsoft.edgemac", "active tab"],
  ["company.thebrowser.Browser", "active tab"],
  ["org.chromium.Chromium", "active tab"],
  ["com.vivaldi.Vivaldi", "active tab"],
]);

export default async function SaveCurrentTab() {
  await saveWithFeedback(async () => {
    const app = await getFrontmostApplication();
    const tab = app.bundleId ? BROWSERS.get(app.bundleId) : undefined;
    if (!tab)
      throw new Error(
        "Run this command from Safari, Chrome, Arc, Brave, Edge, Chromium, or Vivaldi. You can also use Save Clipboard URL.",
      );
    // The bundle ID is restricted to the fixed browser list above.
    return runAppleScript(`tell application id "${app.bundleId}" to get URL of ${tab} of front window`);
  });
}
