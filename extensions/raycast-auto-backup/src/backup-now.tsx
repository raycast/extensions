import {
  showToast,
  Toast,
  launchCommand,
  LaunchType,
  openCommandPreferences,
} from "@raycast/api";
import fs from "fs";
import { passFilePath, pressEnter } from "./helpers";
import path from "path";
/**
 * Does the actual backup
 */

const backup: () => Promise<void> = async () => {
  // Create backup directory
  const backupPath: string = `${process.env.HOME}/Documents/RaycastBackups`;

  if (!fs.existsSync(backupPath)) {
    fs.mkdirSync(backupPath, { recursive: true });
  }

  // Remove all files from the folder
  const files: string[] = fs.readdirSync(backupPath);
  for (const file of files) {
    fs.unlinkSync(path.join(backupPath, file));
  }

  // Launch the export command
  await launchCommand({
    extensionName: "raycast",
    name: "export-settings-data",
    type: LaunchType.Background,
    ownerOrAuthorName: "raycast",
  });

  try {
    // First press Enter to initiate the save dialog
    await pressEnter();

    // Wait for the save dialog to appear
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Then pass the file path and handle the save
    await passFilePath(backupPath);

    // Wait for the save operation to complete
    await new Promise((resolve) => setTimeout(resolve, 1200));

    // Press Enter again to confirm the save
    await pressEnter();
  } catch (error) {
    throw new Error(`Failed to automate backup: ${error}`);
  }
};

/**
 * Entry point of the command
 */

export default async function Command() {
  try {
    await backup();
    await showToast({
      title: "Backup is done!",
      style: Toast.Style.Success,
    });
  } catch (error) {
    console.error(error);
    await showToast({
      title: "An error occurred while backing up.",
      style: Toast.Style.Failure,
      primaryAction: {
        title: "Check Logs",
        onAction: (toast: Toast) => {
          openCommandPreferences();
          toast.hide();
        },
      },
    });
  }
}
