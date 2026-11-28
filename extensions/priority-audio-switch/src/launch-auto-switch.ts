import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";

/**
 * Run Enable Auto Switch once in the background, after a priority, a pinned volume or the device changed. The first run also
 * creates the snapshot it compares against. Fails when Background Refresh is off for the command, so say how to
 * turn it on.
 */
export async function launchAutoSwitch(appliesTo: "priorities" | "pinned volumes" | "silent") {
  try {
    await launchCommand({ name: "auto-switch", type: LaunchType.Background });
  } catch {
    // After a manual switch the run only refreshes the command subtitle; no need to bother the user.
    if (appliesTo === "silent") return;
    await showToast(
      Toast.Style.Animated,
      "Enable Auto Switch",
      `Turn on Background Refresh for this command in Raycast settings so ${appliesTo} are applied automatically.`,
    );
  }
}
