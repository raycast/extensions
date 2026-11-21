import { launchCommand, LaunchType } from "@raycast/api";
import { hasSeenSetup, markSetupSeen } from "./storage";

/**
 * Opens the Setup command the first time any LayoutFixer command runs, since Raycast has no
 * "just installed" hook. Returns true when it did, so the command can stop there.
 */
export async function openSetupOnFirstRun(): Promise<boolean> {
  if (await hasSeenSetup()) return false;
  await markSetupSeen();
  try {
    await launchCommand({ name: "setup", type: LaunchType.UserInitiated });
    return true;
  } catch {
    return false;
  }
}
