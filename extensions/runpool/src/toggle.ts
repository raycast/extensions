import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { findRunpool, getStatus, runpool } from "./lib/runpool";

/**
 * Flip the global kill switch.
 *
 * Reads state first rather than tracking it, because the pause flag is a file
 * that the CLI, the scheduler and this command all touch. Anything cached here
 * would be wrong the moment someone typed `runpool pause` in a terminal.
 */
export default async function Command() {
  if (!findRunpool()) {
    await showHUD("runpool is not installed — run: brew install aicayzer/tap/runpool");
    return;
  }

  try {
    const { paused } = await getStatus({ local: true });
    await runpool([paused ? "resume" : "pause"]);
    await showHUD(paused ? "Local CI resumed, pools wake on demand" : "Local CI paused, all runners down");

    // Nudge the status command so its subtitle is not stale for up to a minute
    // after a deliberate change. Wrapped because that command can be disabled,
    // and a failure to refresh a subtitle must not surface as an error.
    try {
      await launchCommand({ name: "status", type: LaunchType.Background });
    } catch {
      // The status command is disabled. Its subtitle simply stays as it was.
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could not toggle local CI" });
  }
}
