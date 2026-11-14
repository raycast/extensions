/**
 * The address in the front window of the browser that was in front before Raycast opened, for
 * `pickTab` to tell several windows apart. Asked only when it is needed, because the first
 * AppleScript call to a browser makes macOS ask whether Raycast may control it.
 */
import { getFrontmostApplication } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

/** Chromium browsers the helper can be set up in, which all answer Chrome's AppleScript. */
const CHROMIUM_BUNDLES = new Set([
  "com.google.Chrome",
  "com.google.Chrome.beta",
  "com.google.Chrome.dev",
  "com.google.Chrome.canary",
  "org.chromium.Chromium",
  "com.microsoft.edgemac",
  "com.brave.Browser",
  "company.thebrowser.Browser",
  "com.vivaldi.Vivaldi",
]);

export async function frontTabUrl(): Promise<string | undefined> {
  try {
    const app = await getFrontmostApplication();
    if (!app.bundleId || !CHROMIUM_BUNDLES.has(app.bundleId)) return undefined;
    const url = await runAppleScript(
      `tell application id "${app.bundleId}" to return URL of active tab of front window`,
      { timeout: 5_000 },
    );
    return url.trim() || undefined;
  } catch {
    // Not allowed to ask, or no window: the caller says it cannot tell.
    return undefined;
  }
}
