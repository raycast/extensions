import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { getFinderFolder, openInIterm } from "./macos";

export default async function FinderToItermCommand() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening iTerm",
  });

  try {
    await openInIterm(await getFinderFolder());
    toast.style = Toast.Style.Success;
    toast.title = "Opened Finder directory in iTerm";
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open iTerm",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
