import { launchCommand, LaunchType } from "@raycast/api";

export async function runRaycastRestore() {
  try {
    await launchCommand({
      ownerOrAuthorName: "raycast",
      extensionName: "window-management",
      name: "restore",
      type: LaunchType.Background,
    });
  } catch (error) {
    console.error("Failed to launch Raycast Restore command:", error);
  }
}
