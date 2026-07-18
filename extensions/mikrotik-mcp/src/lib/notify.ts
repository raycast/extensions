/**
 * Native notification for background commands, via `raycast-notifier`.
 *
 * Raycast has no first-party push-notification API, and `showHUD`/`showToast`
 * only render while Raycast is frontmost — useless from a `no-view` background
 * refresh. `raycast-notifier` posts to Notification Center through bundled
 * `terminal-notifier` prebuilds (shipped in `assets/prebuilds/`, installed via
 * `npx raycast-notifier-setup`). `preparePrebuilds()` must run once per process
 * before the first `notificationCenter()` call, so we memoise it here.
 */
import { notificationCenter, preparePrebuilds } from "raycast-notifier";

let prepared: Promise<unknown> | null = null;
let warnedUnsupported = false;

/** Copy the notifier prebuilds into place once, reusing the promise thereafter. */
function ready(): Promise<unknown> {
  if (!prepared) prepared = preparePrebuilds();
  return prepared;
}

/**
 * Post a Notification Center alert. Non-fatal: logs, never throws.
 *
 * `timeout: false` matters. Without it `node-notifier` injects `-timeout 10` and
 * blocks on `terminal-notifier` until the banner expires — ~10s per alert. Raycast
 * terminates a background command after a timeout derived from its `interval`, so
 * serial 10s waits get the run killed before it can persist state or update the
 * subtitle. Posting without a timeout returns in ~250ms.
 */
export async function notify(title: string, message: string): Promise<void> {
  // raycast-notifier posts through `terminal-notifier`, a macOS-only binary — on
  // any other platform preparePrebuilds() throws. Skip cleanly (once-warned) so a
  // background run isn't silently dying on every alert.
  if (process.platform !== "darwin") {
    if (!warnedUnsupported) {
      warnedUnsupported = true;
      console.warn(
        "notify: native notifications are macOS-only; skipping on this platform.",
      );
    }
    return;
  }
  try {
    await ready();
    await notificationCenter({ title, message, timeout: false });
  } catch (error) {
    // Best-effort, but never silent: a swallowed failure here looks exactly like
    // "the flip was never detected". Surfaces in the Raycast error console.
    console.error(`notify("${title}") failed:`, error);
  }
}
