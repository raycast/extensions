import { closeMainWindow, PopToRootType, showToast, Toast } from "@raycast/api";
import { openInChromeProfile } from "./chrome";

export async function openLink(url: string, profileDirectory: string): Promise<void> {
  try {
    await openInChromeProfile(url, profileDirectory);
    await closeMainWindow({ popToRootType: PopToRootType.Immediate });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Google Chrome",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
