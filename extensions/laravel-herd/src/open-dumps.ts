import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { Herd } from "./utils/Herd";
import { rescue } from "./utils/rescue";

export default async function main() {
  await showToast({
    title: "Opening Dumps...",
    style: Toast.Style.Animated,
  });

  await rescue(() => Herd.Dumps.open(), "Failed to open Dumps.");

  await closeMainWindow();
}
