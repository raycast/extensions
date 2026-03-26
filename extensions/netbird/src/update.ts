import { showToast, Toast } from "@raycast/api";
import { netbirdUpdate } from "./utils";

export default async function main() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Updating NetBird",
      message: "Checking for updates... This might take a minute.",
    });

    const { version, updated, latestVersion } = await netbirdUpdate();

    if (updated) {
      await showToast({
        style: Toast.Style.Success,
        title: "NetBird Updated",
        message: `Current version ${version}.`,
      });
    } else if (latestVersion && latestVersion !== version) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Automatic Update Failed",
        message: `Version ${latestVersion} is available. Please update manually via GitHub.`,
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: "NetBird is up to date",
        message: `Current version ${version}.`,
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to update NetBird",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
