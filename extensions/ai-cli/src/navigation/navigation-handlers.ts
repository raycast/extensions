import { launchCommand, LaunchType } from "@raycast/api";
import { showFailureToast } from "@/utils/toast";

/**
 * Creates a navigation handler function for launching Raycast commands with error handling
 */
export const createNavigationHandler = (commandName: string, errorTitle?: string, errorMessage?: string) => {
  return async () => {
    try {
      await launchCommand({
        name: commandName,
        type: LaunchType.UserInitiated,
      });
    } catch {
      const finalErrorTitle = errorTitle || "Navigation Failed";
      const finalErrorMessage = errorMessage || `Could not launch command: ${commandName}`;

      showFailureToast(finalErrorTitle, finalErrorMessage);
    }
  };
};
