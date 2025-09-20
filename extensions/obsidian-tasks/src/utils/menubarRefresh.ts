import { launchCommand, LaunchType } from "@raycast/api";

export const refreshMenubar = async (): Promise<void> => {
  try {
    await launchCommand({
      name: "menubar-item",
      type: LaunchType.Background,
    });
  } catch (error) {
    console.error("Failed to refresh menubar:", error);
  }
};
