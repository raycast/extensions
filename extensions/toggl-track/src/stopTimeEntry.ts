import { showHUD, showToast, Toast } from "@raycast/api";
import dayjs from "dayjs";

import { refetchRunningTimeEntry, stopTimeEntry } from "@/api";
import { refreshMenuBar } from "@/helpers/common";
import { formatSeconds } from "@/helpers/formatSeconds";

export default async function Command() {
  let runningTimeEntry;
  try {
    // Never read the cache on a destructive path. Any cached entry can be stale —
    // Low Data Mode serves one for up to an hour, and normal mode for the TTL — so a
    // timer stopped or replaced in another client leaves a stale entry behind, and
    // stopping that one reports a failure while the real timer keeps running.
    runningTimeEntry = await refetchRunningTimeEntry();
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
