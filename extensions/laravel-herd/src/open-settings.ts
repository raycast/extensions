import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  await showToast({
    title: "Opening Settings...",
    style: Toast.Style.Animated,
  });

  await rescue(() => Herd.General.openSettings("general"), "Failed to open Settings.");

  await closeMainWindow();
}
