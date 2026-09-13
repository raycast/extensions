import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { getFinderFolder, openInVisualStudioCode } from "./macos";

export default async function OpenInVisualStudioCodeCommand() {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Opening VS Code",
  });

  try {
    await openInVisualStudioCode(await getFinderFolder());
    toast.style = Toast.Style.Success;
    toast.title = "Opened Finder directory in VS Code";
    await closeMainWindow();
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open VS Code",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
