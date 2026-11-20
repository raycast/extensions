import { environment, LaunchType, updateCommandMetadata } from "@raycast/api";
import { defaultLevel } from "./lib/control";
import { statusSubtitle } from "./lib/displays";
import { status } from "./lib/helper";
import { log } from "./lib/log";
import { runNoView } from "./lib/no-view";

export default async function Command() {
  // Background launches come from this command's 1-minute interval (which catches pauses, crashes and Raycast
  // quitting) and from applyOperation after every change. They only update the subtitle: a background launch must
  // never change the boost.
  if (environment.launchType !== LaunchType.Background)
    await runNoView({ kind: "toggle", level: defaultLevel() }, "Toggling XDR Boost");
  await showStatus();
}

/** Shows the current state as this command's root-search subtitle, so Toggle says which way it will go. */
async function showStatus(): Promise<void> {
  try {
    await updateCommandMetadata({ subtitle: statusSubtitle(await status()) });
  } catch (error) {
    log("subtitle refresh failed", { error: error instanceof Error ? error.message : String(error) });
    // A stale "On" is worse than none: fall back to the default subtitle, the extension's name.
    await updateCommandMetadata({ subtitle: null }).catch(() => undefined);
  }
}
