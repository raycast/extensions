import { getSelectedText, open, showHUD } from "@raycast/api";
import { getResolvedPreferences } from "./preferences";
import { resolveQueryToUrl } from "./query";

/**
 * Read the frontmost app's selected text, returning "" when there is none (or
 * Raycast lacks Accessibility access). getSelectedText's rejection message isn't
 * stable across apps, so callers treat any failure as simply "no selection".
 */
export async function readSelection(): Promise<string> {
  try {
    return await getSelectedText();
  } catch {
    return "";
  }
}

/** Best-effort host for the success HUD (e.g. "duckduckgo.com"). */
function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "browser";
  }
}

/**
 * Shared body for all three commands: resolve raw text to a target URL using the
 * user's preferences and open it in the chosen browser. Shows `emptyMessage`
 * (and opens nothing) when there is no usable text.
 */
export async function openForText(rawText: string | undefined, emptyMessage: string): Promise<void> {
  const prefs = getResolvedPreferences();
  const url = resolveQueryToUrl(rawText, prefs);
  if (!url) {
    await showHUD(emptyMessage);
    return;
  }

  // Application.bundleId is the most reliable target for `open`; fall back to
  // the app name, or undefined = system default browser.
  const app = prefs.browser?.bundleId ?? prefs.browser?.name;
  try {
    await open(url, app);
  } catch {
    // Guard the open here (not in the callers) so a browser-launch failure is
    // never mis-reported as a text-read failure, and so every command — even
    // ones without their own try/catch — fails gracefully.
    await showHUD(prefs.browser ? `Couldn't open ${prefs.browser.name}` : "Couldn't open browser");
    return;
  }
  await showHUD(`Opening ${hostOf(url)}`);
}
