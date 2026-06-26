/**
 * Open Today — jump to today's journal in the outl desktop app via the
 * `outl://daily/today` deep link.
 *
 * No CLI call is needed: the app resolves `today` itself. Opening the
 * URL depends on the desktop app having registered the `outl://` scheme
 * (issue #98); if no handler is registered, macOS shows its own dialog.
 */

import { open, showHUD } from "@raycast/api";
import { dailyTodayLink } from "./lib/deeplink";
import { showErrorToast } from "./lib/errors";

export default async function OpenToday(): Promise<void> {
  try {
    await open(dailyTodayLink());
    await showHUD("Opening today in outl");
  } catch (err) {
    await showErrorToast(err);
  }
}
