import {
  closeMainWindow,
  getFrontmostApplication,
  showHUD,
} from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { copyGmailSubject, showLoadingHUD } from "./utils/common-utils.js";
import { runAppleShortcut } from "./utils/applescript-utils.js";

export default async (props) => {
  // Extract the prefix from arguments if provided
  const { prefix } = props.arguments || {};

  await closeMainWindow();
  await showLoadingHUD("Copying email subject...");
  const frontmostApp = await getFrontmostApplication();

  console.log("Frontmost app:", frontmostApp.name);

  const result = await copyGmailSubject(frontmostApp);

  if (!result) {
    // Provide more specific error messages based on the app
    const appName = frontmostApp.name.toLowerCase();

    if (appName.includes("dia")) {
      await showHUD(
        "⚠️ Dia browser detected. Please install the Raycast Browser Extension for better support.",
      );
    } else if (
      appName.includes("chrome") ||
      appName.includes("safari") ||
      appName.includes("firefox") ||
      appName.includes("edge")
    ) {
      await showHUD(
        "⚠️ Couldn't find Gmail subject. Make sure you're on a Gmail page.",
      );
    } else {
      await showHUD(
        "⚠️ Couldn't find Gmail subject. Please open Gmail in your browser first.",
      );
    }
  } else {
    try {
      // Store the last copied subject in local storage
      await LocalStorage.setItem("lastEmailSubject", result);

      // Apply prefix if provided
      const finalSubject = prefix ? `[${prefix}] ${result}` : result;

      await showHUD("📝 Starting time tracking...");
      await runAppleShortcut("Start Time Tracking In Production", finalSubject);
      await showHUD("✅ Time tracking started");
    } catch (error) {
      await showHUD(`⚠️ Failed to start time tracking: ${error.message}`);
      console.error("Time tracking error:", error);
    }
  }
};
