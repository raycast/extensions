import { showHUD, showToast, Toast } from "@raycast/api";
import { getConfig, validateConfig } from "./config";
import { checkEagleStatus, uploadScreenshot } from "./eagle-api";
import { takeScreenshot } from "./screenshot";
import { deleteFile, fileToBase64, generateFileName, getTempFilePath } from "../utils";
import { ScreenshotMode } from "../types";

/**
 * Core screenshot and upload to Eagle functionality
 * @param mode Screenshot mode (optional, uses default mode from config if not provided)
 */
export async function shotToEagle(mode?: ScreenshotMode) {
  try {
    // 1. Get and validate configuration
    const config = await getConfig();
    const validation = validateConfig(config);

    if (!validation.isValid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Configuration Error",
        message: validation.errors[0],
      });
      return;
    }

    // 2. Check if Eagle is running
    await showToast({
      style: Toast.Style.Animated,
      title: "Checking Eagle...",
    });

    const eagleRunning = await checkEagleStatus();
    if (!eagleRunning) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Eagle is not running",
        message: "Please start Eagle first.",
      });
      return;
    }

    // 3. Take screenshot
    // Close toast and prepare for screenshot (HUD automatically closes Raycast)
    await showHUD("Taking Screenshot...");

    // Wait for Raycast window to close, ensuring screenshot interface displays properly
    await new Promise((resolve) => setTimeout(resolve, 500));

    const fileName = generateFileName();
    const tempFilePath = getTempFilePath(fileName);

    // Use provided mode or default mode from config
    const actualMode = mode || config.defaultMode;

    const screenshotResult = await takeScreenshot({
      mode: actualMode,
      outputPath: tempFilePath,
      includeCursor: config.includeCursor,
      playSound: config.playSound,
      delay: config.timedDelay,
    });

    // 4. Handle screenshot result
    if (!screenshotResult.success) {
      if (screenshotResult.cancelled) {
        // User cancelled screenshot, don't show any message
        return;
      }

      await showToast({
        style: Toast.Style.Failure,
        title: "Screenshot Failed",
        message: screenshotResult.error || "Unknown error",
      });
      return;
    }

    if (!screenshotResult.filePath) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Screenshot Failed",
        message: "No file path returned",
      });
      return;
    }

    // 5. Upload to Eagle
    await showHUD("Uploading to Eagle...");

    // Convert file to Base64
    const base64Data = await fileToBase64(screenshotResult.filePath);

    // Upload screenshot
    const uploadResult = await uploadScreenshot({
      url: base64Data,
      name: fileName.replace(".png", ""), // Remove extension
      folderId: config.folderId,
      modificationTime: Date.now(),
    });

    // 6. Clean up temporary file
    await deleteFile(screenshotResult.filePath);

    // 7. Display result
    if (uploadResult.success) {
      await showHUD("✓ Saved to Eagle");
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Upload Failed",
        message: uploadResult.error || "Unknown error",
      });
    }
  } catch (error) {
    console.error("Error in shotToEagle:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Unexpected Error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
