import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { openItermDirectoryInFinder } from "./macos";

export default async function ItermToFinderCommand() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening Finder",
  });

  try {
    await openItermDirectoryInFinder();
    toast.style = Toast.Style.Success;
    toast.title = "Opened iTerm directory in Finder";
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Finder",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
