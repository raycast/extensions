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

/** Copy the notifier prebuilds into place once, reusing the promise thereafter. */
function ready(): Promise<unknown> {
  if (!prepared) prepared = preparePrebuilds();
  return prepared;
}

/** Post a Notification Center alert. Non-fatal: swallows failures. */
export async function notify(title: string, message: string): Promise<void> {
  try {
    await ready();
    await notificationCenter({ title, message });
  } catch {
    /* notifications are best-effort; never fail the background run over one */
  }
}
