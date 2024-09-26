import { execSync } from "child_process";
import { closeMainWindow, showToast, ToastStyle } from "@raycast/api";

export default async function Command() {
  try {
    // Execute the JavaScript for Automation (JXA) script to open a new Safari window
    const script = `
      var safari = Application('Safari');
      safari.activate();
      safari.Document().make();
    `;
    execSync(`osascript -l JavaScript -e "${script}"`);

    // Show a toast notification that the window was opened
    await showToast(ToastStyle.Success, "New Safari Window Opened");

    // Close the Raycast window after the action completes
    await closeMainWindow();
  } catch (error: unknown) {
    // Handle any errors and show failure toast
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await showToast(ToastStyle.Failure, "Failed to Open Safari Window", errorMessage);

    // Ensure the Raycast window is closed even if an error occurs
    await closeMainWindow();
  }
}
