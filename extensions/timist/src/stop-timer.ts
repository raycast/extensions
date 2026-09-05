import { showHUD } from "@raycast/api";
import { getActiveTimer, stopTimer } from "./api/client";
import { ensureCacheOwner } from "./lib/cache";
import { showApiErrorToast, withRateLimitRetry } from "./lib/errors";
import { formatDuration } from "./lib/format";
import { refreshMenuBar } from "./lib/refresh";

export default async function Command() {
  ensureCacheOwner();
  try {
    // Always a fresh lookup — stopping a stale cached ID could target the
    // wrong resource.
    const active = await getActiveTimer();
    if (!active) {
      await showHUD("No timer running");
      return;
    }
    const stopped = await withRateLimitRetry(() => stopTimer(active.id));
    await showHUD(`⏹ ${stopped.title} · ${formatDuration(stopped.completed_duration_seconds)}`);
    await refreshMenuBar();
  } catch (error) {
    await showApiErrorToast(error);
  }
}
