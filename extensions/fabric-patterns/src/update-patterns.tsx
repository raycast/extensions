import { showHUD, showToast, Toast } from "@raycast/api";
import { setTimeout as sleep } from "node:timers/promises";
import { fetchPatterns, recoveryAction } from "./states";
import { shownText } from "./deliver";
import { prefs } from "./storage";

/** The longest a failure toast stays up; a click on its action ends it sooner. */
export const FAILURE_LINGER_MS = 10_000;

// Running this command is the request, so it asks nothing first. Manage Fabric's Update Patterns
// confirms per ISC-63; ISC-37's confirm rule covers only destructive actions, and this isn't one.
export default async function Command(_props?: unknown, lingerMs = FAILURE_LINGER_MS) {
  // This is a no-view command, so Raycast unloads it on return, and a toast still up then outlives
  // it: live, a failure toast sat in root search ten minutes later. So whichever toast is current
  // is hidden on the way out, whatever path or error ends the command.
  let current = await showToast({ style: Toast.Style.Animated, title: "Updating fabric's patterns…" });
  try {
    const r = await fetchPatterns(prefs().fabricPath);
    if (r.ok) return await showHUD("Fabric patterns updated");
    // A failure stays a toast, not a HUD: it can be reread and can carry the fix. Changing the
    // progress toast with setters showed only the title, live, 2026-10-20 (each setter is an
    // unawaited update, per the API types), so the failure is one awaited showToast. Then the
    // command waits up to lingerMs, or until its action finishes, so it can be read and acted on.
    const action = recoveryAction(r.state);
    let clicked = () => {};
    const click = new Promise<void>((resolve) => (clicked = resolve));
    await current.hide();
    current = await showToast({
      style: Toast.Style.Failure,
      title: "Couldn't update patterns",
      message: r.state.description && shownText(r.state.description),
      // The action finishes before the wait ends; a failing one still ends it and reaches Raycast.
      primaryAction: action && {
        ...action,
        onAction: async (t) => {
          try {
            await action.onAction(t);
          } finally {
            clicked();
          }
        },
      },
    });
    await Promise.race([sleep(lingerMs), click]);
  } finally {
    await current.hide();
  }
}
