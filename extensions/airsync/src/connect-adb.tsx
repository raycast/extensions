import { showToast, Toast, closeMainWindow, showHUD } from "@raycast/api";
import { connectAdb } from "./utils/applescript";

export default async function Command() {
  try {
    await closeMainWindow();

    const response = await connectAdb();

    // Check for specific error messages
    if (response === "Connected") {
      await showHUD(`✅ ${response}`);
    } else if (response === "ADB connection already in progress") {
      await showHUD(`⏳ ${response}`);
    } else if (
      response === "Requires AirSync+" ||
      response === "No device connected" ||
      response.includes("ADB not found") ||
      response.includes("Device not found") ||
      response.includes("ADB connection failed") ||
      response.includes("Connection refused") ||
      response.includes("Connection failed")
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to connect ADB",
        message: response,
      });
    } else {
      // Unknown response, show as info
      await showHUD(`ℹ️ ${response}`);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to connect ADB",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
