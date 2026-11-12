import { launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

/** Open the native cleanup command when the user asks to clean or delete artifacts. Does not select, trash, or delete anything; the user reviews fresh results and confirms exact paths in Raycast. */
export default async function tool() {
  try {
    await launchCommand({ name: "scan-artifacts", type: LaunchType.UserInitiated });
  } catch (error) {
    const message =
      "Check that Scan Development Artifacts is enabled in Raycast Settings → Extensions, then try again.";
    await showFailureToast(error, { title: "Could Not Open Scan Development Artifacts", message }).catch((toastError) =>
      console.error("Could not show the cleanup launch failure toast", toastError),
    );
    return {
      opened: false,
      command: "Scan Development Artifacts",
      cleanupPerformed: false,
      message: `Could not open the native command. ${message} No files were moved or deleted.`,
    };
  }
  return {
    opened: true,
    command: "Scan Development Artifacts",
    cleanupPerformed: false,
    message:
      "Opened the native command with its saved settings. Review fresh results, select exact directories, and confirm Move to Trash or Permanent Deletion. No files have been moved or deleted by this tool.",
  };
}
