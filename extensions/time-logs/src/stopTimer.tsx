import { useEffect } from "react";
import { showToast, Toast, popToRoot, launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { stopActiveTimer, getActiveTimer, getProjectById } from "./storage";

export default function StopTimer() {
  // Stop timer on component mount
  useEffect(() => {
    stopTimer();
  }, []);

  // Helper function to refresh the menu bar timer
  async function refreshMenuBar() {
    try {
      await launchCommand({ name: "menuBarTimer", type: LaunchType.UserInitiated });
    } catch (error) {
      console.error("Failed to refresh menu bar timer:", error);
    }
  }

  // Stop the active timer if one exists
  async function stopTimer() {
    try {
      // First check if a timer is running
      const activeTimer = await getActiveTimer();

      if (activeTimer) {
        // Stop the timer
        const stoppedTimer = await stopActiveTimer();

        if (stoppedTimer) {
          // Get project name if available
          let projectText = "";
          if (stoppedTimer.projectId) {
            const project = await getProjectById(stoppedTimer.projectId);
            if (project) {
              projectText = project.name;
            }
          }

          // Refresh the menu bar timer first (this will show "Menu Bar item refreshed")
          await refreshMenuBar();

          // Now show our toast message, which will be the last thing the user sees
          await showToast({
            style: Toast.Style.Success,
            title: `${projectText ? projectText + " — " : ""}${stoppedTimer.description || "Untitled"} timer stopped`,
          });
        } else {
          // Timer was discarded (less than 1 minute)

          // Refresh the menu bar timer first (this will show "Menu Bar item refreshed")
          await refreshMenuBar();

          // Now show our toast message, which will be the last thing the user sees
          await showToast({
            style: Toast.Style.Failure,
            title: "Discarded!",
            message: "Entries shorter than 1 min are removed",
          });
        }
      } else {
        // No active timer found
        await showToast({
          style: Toast.Style.Failure,
          title: "No Timer is currently running",
        });
      }

      // Close Raycast
      popToRoot();
    } catch (error) {
      console.error("Error stopping timer:", error);
      await showFailureToast(error, { title: "Failed to stop timer" });
      popToRoot();
    }
  }

  // No UI is rendered - everything happens in the useEffect
  return null;
}
