import { LocalStorage, showToast, Toast } from "@raycast/api";
import { prefs } from "./state";
import { checkForUpdates, UpdateCheck } from "./update";

const LAST_CHECK = "update.lastCheck";
const UNCHANGED_TAG = "update.unchangedTag";
const AUTO_CHECK_EVERY = 7 * 24 * 60 * 60 * 1000;

/** Runs a check and remembers the result so unchanged releases aren't re-diffed. */
export async function runCheck(): Promise<UpdateCheck> {
  const unchanged = await LocalStorage.getItem<string>(UNCHANGED_TAG);
  const result = await checkForUpdates(unchanged);
  await LocalStorage.setItem(LAST_CHECK, Date.now());
  if (result.status === "no-symbol-changes") await LocalStorage.setItem(UNCHANGED_TAG, result.latest);
  return result;
}

export async function lastCheckedAt(): Promise<Date | undefined> {
  const t = await LocalStorage.getItem<number>(LAST_CHECK);
  return t ? new Date(t) : undefined;
}

/**
 * Called when the search command opens. At most once a week, quietly checks
 * for new symbols and offers the update in a toast; it never installs on its own.
 */
export async function maybeAutoCheck(openUpdate: () => void) {
  if (!(prefs().autoCheckUpdates ?? true)) return;
  const last = (await LocalStorage.getItem<number>(LAST_CHECK)) ?? 0;
  if (Date.now() - last < AUTO_CHECK_EVERY) return;
  // Record the attempt up front, so a failed check (offline, rate-limited)
  // also waits a week rather than retrying on every launch.
  await LocalStorage.setItem(LAST_CHECK, Date.now());
  try {
    const result = await runCheck();
    if (result.status !== "available") return;
    const count = result.changes.reduce((n, c) => n + c.added.length + c.removed.length + c.modified.length, 0);
    await showToast({
      style: Toast.Style.Success,
      title: "New symbols available",
      message: `Open Symbols ${result.latest} changes ${count.toLocaleString()} symbols`,
      primaryAction: {
        title: "Update Now",
        shortcut: { modifiers: ["cmd"], key: "u" },
        onAction: (toast) => {
          void toast.hide();
          openUpdate();
        },
      },
    });
  } catch {
    // Offline or rate-limited: try again next week, silently.
  }
}
