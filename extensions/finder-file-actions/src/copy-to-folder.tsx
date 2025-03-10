import { launchCommand, LaunchType, showToast, Toast } from "@raycast/api";
import { useEffect } from "react";

export default function Command() {
  useEffect(() => {
    // Launch the move-to-folder command with copy mode
    try {
      launchCommand({
        name: "move-to-folder",
        type: LaunchType.UserInitiated,
        arguments: {
          mode: "copy",
        },
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to launch command",
        message: String(error),
      });
    }
  }, []);

  // Return null as we're just redirecting
  return null;
}
