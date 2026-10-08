import { closeMainWindow, environment, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  await closeMainWindow();

  try {
    const folderPath = environment.supportPath;
    await open(folderPath);

    await showToast({
      style: Toast.Style.Success,
      title: "Open Config Folder",
      message: folderPath,
    });
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to open config folder",
    });
  }
}
