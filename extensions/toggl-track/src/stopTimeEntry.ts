import { showHUD, showToast, Toast } from "@raycast/api";
import dayjs from "dayjs";

import { getRunningTimeEntry, refetchRunningTimeEntry, stopTimeEntry } from "@/api";
import { refreshMenuBar } from "@/helpers/common";
import { formatSeconds } from "@/helpers/formatSeconds";
import { liteMode } from "@/helpers/preferences";

export default async function Command() {
  let runningTimeEntry;
  try {
    // Low Data Mode serves the cache for up to an hour, so for a destructive action
    // both a miss AND a hit can be wrong: a timer stopped or replaced in another
    // client leaves a stale entry behind, and stopping that one reports a failure
    // while the real timer keeps running. Confirm against the API. Normal mode
    // already reaches the API on a miss, so it pays nothing extra here.
    runningTimeEntry = liteMode ? await refetchRunningTimeEntry() : await getRunningTimeEntry();
  } catch {
    await showToast(Toast.Style.Failure, "Failed to reach Toggl", "Could not check for a running time entry.");
    return;
  }

  if (!runningTimeEntry) {
    await showHUD("No running time entry to stop");
    return;
  }

  const description = runningTimeEntry.description || "Time entry";
  // Read the elapsed time before stopping. The clamp mirrors formatSeconds and
  // guards against a mis-entered future start rendering a negative duration.
  const elapsedSeconds = Math.max(0, dayjs().diff(dayjs(runningTimeEntry.start), "second"));

  try {
    await stopTimeEntry({ id: runningTimeEntry.id, workspaceId: runningTimeEntry.workspace_id });
  } catch {
    await showToast(Toast.Style.Failure, "Failed to stop time entry", description);
    return;
  }

  await refreshMenuBar();
  await showHUD(`Stopped ${description} · ${formatSeconds(elapsedSeconds)}`);
}
