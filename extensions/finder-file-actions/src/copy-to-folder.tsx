import { LaunchProps, launchCommand, LaunchType } from "@raycast/api";
import { useEffect } from "react";

export default function Command(props: LaunchProps) {
  useEffect(() => {
    // Launch the move-to-folder command with copy mode
    launchCommand({
      name: "move-to-folder",
      type: LaunchType.UserInitiated,
      arguments: {
        mode: "copy"
      }
    });
  }, []);
  
  // Return null as we're just redirecting
  return null;
} 