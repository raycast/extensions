import { Clipboard, showToast, Toast, showHUD, closeMainWindow } from "@raycast/api";
import { log, takeScreenshot, cleanupScreenshot, findPix2tex, runPix2tex } from "./utils";

/**
 Capture screenshot → OCR with pix2tex → Copy to clipboard
 */
export default async function Command() {
  let screenshotPath: string | null = null;

  try {
    // Step 0: Find pix2tex executable
    const pix2texPath = await findPix2tex();

    if (!pix2texPath) {
      log("pix2tex not found, showing error");
      await showToast({
        style: Toast.Style.Failure,
        title: "pix2tex not found",
        message: "Install with: pipx install pix2tex",
      });
      return;
    }

    // Close Raycast window before taking screenshot
    await closeMainWindow();

    // Step 1: Take screenshot
    screenshotPath = await takeScreenshot();

    if (!screenshotPath) {
      await showHUD("❌ Screenshot cancelled");
      return;
    }

    // Step 2: Run OCR
    await showToast({
      style: Toast.Style.Animated,
      title: "Processing...",
    });

    const latex = await runPix2tex(screenshotPath, pix2texPath);

    // Step 3: Handle result
    log("Step 3: Processing result...", { latex });
    if (!latex || latex.trim() === "") {
      await showHUD("⚠️ No LaTeX detected in image");
      return;
    }

    // Step 4: Clean output
    // Remove path to screenshot
    const cleanedLatex = latex.includes(".png:") ? latex.substring(latex.indexOf(".png:") + 5).trim() : latex.trim();

    // Update latex variable with cleaned version
    const finalLatex = cleanedLatex;

    // Step 5: Copy to clipboard
    await Clipboard.copy(finalLatex);

    // Show success with preview
    const preview = finalLatex.length > 40 ? finalLatex.substring(0, 40) + "..." : finalLatex;
    log("Success!", { preview });
    await showHUD(`✅ Copied: ${preview}`);
  } catch (error) {
    log("Command failed with error", error);
    console.error("LaTeX OCR Error:", error);

    const message = error instanceof Error ? error.message : "Unknown error occurred";

    await showToast({
      style: Toast.Style.Failure,
      title: "Recognition failed",
      message: message.substring(0, 100),
    });
  } finally {
    // Always clean up the screenshot file
    if (screenshotPath) {
      cleanupScreenshot(screenshotPath);
    }
  }
}
