import { getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { UsageAlert } from "./thresholds";

/**
 * AppleScript string literals accept only backslash and double-quote escapes,
 * and a literal newline terminates the statement, so those are folded to spaces.
 */
function escapeAppleScript(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/[\r\n]+/g, " ");
}

async function postToNotificationCenter(alert: UsageAlert): Promise<void> {
  const script = [
    "display notification",
    `"${escapeAppleScript(alert.message)}"`,
    "with title",
    `"${escapeAppleScript("AI Usage")}"`,
    "subtitle",
    `"${escapeAppleScript(alert.title)}"`,
  ].join(" ");

  await runAppleScript(script);
}

/**
 * Delivers alerts through whichever channels are enabled. A failure in one
 * channel must not suppress the other, and must never abort the monitor run.
 */
export async function deliver(alerts: UsageAlert[]): Promise<void> {
  if (alerts.length === 0) return;

  const prefs = getPreferenceValues<Preferences>();
  const useHUD = prefs.notifyHUD;
  const useNotificationCenter = prefs.notifyNotificationCenter;
  if (!useHUD && !useNotificationCenter) return;

  for (const alert of alerts) {
    if (useNotificationCenter) {
      try {
        await postToNotificationCenter(alert);
      } catch {
        // Notification permission may be denied; the HUD path can still work.
      }
    }

    if (useHUD) {
      try {
        // Toast success/failure styles are unavailable in background mode, so
        // the HUD is the only in-Raycast surface here.
        await showHUD(`${alert.title} — ${alert.message}`);
      } catch {
        // No-op: a missing HUD must not fail the run.
      }
    }
  }
}
