import { LaunchType, launchCommand, showHUD } from "@raycast/api";

export async function safeLaunchCommandInBackground(commandName: string): Promise<void> {
  try {
    await launchCommand({ name: commandName, type: LaunchType.Background });
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Check for specific error messages and handle them silently
      if (
        error.message.includes("No enabled command") ||
        error.message.includes("The operation couldn’t be completed")
      ) {
        // Log the error silently without showing HUD
        console.log("Silent Error:", error.message);
      } else {
        await showHUD("Error executing command");
      }
    } else {
      console.log("An unexpected error type occurred:", error);
    }
  }
}
