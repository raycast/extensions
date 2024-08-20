import { showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";

export default function Command() {
  try {
    const fileName = `com.raycast.${Math.random()}`;
    execSync(`touch ~/Library/LaunchAgents/${fileName}.plist`);
    showToast(Toast.Style.Success, "File Created", `Name: ${fileName}.plist`);
  } catch (error) {
    console.error("Error creating file:", error);
    showToast(Toast.Style.Failure, "Error", "Failed to create the file.");
  }
}
