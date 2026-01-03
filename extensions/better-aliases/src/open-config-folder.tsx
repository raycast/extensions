import { closeMainWindow, open, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { dirname } from "path";
import { getBetterAliasesPath } from "./lib/betterAliases";

export default async function OpenConfigFolder() {
  await closeMainWindow();

  try {
    const configPath = getBetterAliasesPath();
    const folderPath = dirname(configPath);

    await open(folderPath);

    await showToast({
      style: Toast.Style.Success,
      title: "Opened Config Folder",
      message: folderPath,
    });
  } catch (error) {
    await showFailureToast(error, {
      title: "Failed to open folder",
    });
  }
}
