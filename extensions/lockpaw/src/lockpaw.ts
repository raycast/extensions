import { open, showHUD, showToast, Toast } from "@raycast/api";

type LockpawCommand = "lock" | "unlock" | "unlock-password" | "toggle";

export async function runLockpawCommand(
  command: LockpawCommand,
  hudMessage: string,
): Promise<void> {
  try {
    await open(`lockpaw://${command}`);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Lockpaw is not installed",
    });
    return;
  }
  await showHUD(hudMessage);
}
