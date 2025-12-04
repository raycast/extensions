import { showToast, Toast } from "@raycast/api";
import { createLaunchAgent } from "../lib/plist";

export default function Command() {
  try {
    const fileName = createLaunchAgent();
    showToast(Toast.Style.Success, "File Created", `Name: ${fileName}.plist`);
  } catch (error) {
    console.error("Error creating file:", error);
    showToast(Toast.Style.Failure, "Error", "Failed to create the file.");
  }
}
