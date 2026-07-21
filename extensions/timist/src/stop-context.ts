import { showHUD } from "@raycast/api";
import { getActiveContext, stopContext } from "./api/client";
import { ensureCacheOwner } from "./lib/cache";
import { showApiErrorToast, withRateLimitRetry } from "./lib/errors";
import { formatDuration } from "./lib/format";
import { refreshMenuBar } from "./lib/refresh";

// Never entitlement-gated: context stop stays available post-downgrade.
export default async function Command() {
  ensureCacheOwner();
  try {
    const active = await getActiveContext();
    if (!active) {
      await showHUD("No context running");
      return;
    }
    const stopped = await withRateLimitRetry(() => stopContext(active.id));
    await showHUD(`◌ ${stopped.display_label} · ${formatDuration(stopped.completed_duration_seconds)}`);
    await refreshMenuBar();
  } catch (error) {
    await showApiErrorToast(error);
  }
}
