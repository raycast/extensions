import { launchCommand, LaunchType } from "@raycast/api";

/** Open the native cleanup command when the user asks to clean or delete artifacts. Does not select, trash, or delete anything; the user reviews fresh results and confirms exact paths in Raycast. */
export default async function tool() {
  await launchCommand({ name: "scan-artifacts", type: LaunchType.UserInitiated });
  return {
    opened: true,
    command: "Scan Development Artifacts",
    cleanupPerformed: false,
    message:
      "Opened the native command with its saved settings. Review fresh results, select exact directories, and confirm Move to Trash or Permanent Deletion. No files have been moved or deleted by this tool.",
  };
}
