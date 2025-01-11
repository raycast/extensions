import { Alert, confirmAlert, showToast, Toast, Icon } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default async function main() {
  const userConfirmed = await confirmAlert({
    title: "Clear Downloads Folder",
    message: "Are you sure you want to delete all files in your Downloads folder? This action cannot be undone.",
    icon: Icon.Trash,
    primaryAction: {
      title: "Delete",
      style: Alert.ActionStyle.Destructive,
    },
  });

  if (!userConfirmed) {
    return;
  }

  try {
    // Define the Downloads path and validate
    const downloadsPath = `${process.env.HOME}/Downloads`;
    if (!downloadsPath) {
      throw new Error("Unable to locate Downloads folder.");
    }

    // Execute shell command safely
    await execAsync(`rm -rf "${downloadsPath}"/*`);

    // Show success message
    await showToast({
      style: Toast.Style.Success,
      title: "Downloads Cleared",
      message: "All files in your Downloads folder have been deleted.",
    });
  } catch (error) {
    // Show error message
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: `Failed to clear Downloads: ${errorMessage}`,
    });
  }
}
