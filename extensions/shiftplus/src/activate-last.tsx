import { open, showHUD, showToast, Toast } from "@raycast/api";

export default async function ActivateLast() {
  try {
    await open("shiftplus://activate-last");
    await showHUD("Workspace activated");
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to activate workspace",
      message: "Make sure ShiftPlus is running.",
    });
  }
}
