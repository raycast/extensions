import { showToast, Toast } from "@raycast/api";
import { execa } from "execa";
import fs from "fs";
import path from "path";

async function resetFolderIcon(directoryPath: string) {
  try {
    // Check if the destination folder exists
    if (!fs.existsSync(directoryPath) || !fs.lstatSync(directoryPath).isDirectory()) {
      throw new Error(`Destination "${directoryPath}" does not exist or is not a directory.`);
    }

    // Path to the old custom icon
    const oldIcon = path.join(directoryPath, "Icon\r");

    // If a custom icon exists, remove it
    if (fs.existsSync(oldIcon)) {
      fs.unlinkSync(oldIcon);
    }

    // Remove the custom attribute that marks the folder as having a custom icon
    await execa("SetFile", ["-a", "c", directoryPath]);

    // Refresh Finder view for the destination folder
    await execa("osascript", ["-e", `tell application "Finder" to update item POSIX file "${directoryPath}"`]);

    await showToast({
      style: Toast.Style.Success,
      title: "Reset Folder Icon Successful",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Reset Folder Icon Failed",
      message: (error as Error).message || "An unexpected error occurred.",
    });
    console.error(error);
  }
}

export { resetFolderIcon };
