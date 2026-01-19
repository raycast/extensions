/**
 * Clean Figma Link - Main Command
 *
 * This Raycast command cleans and optionally shortens Figma URLs.
 *
 * How it works:
 * 1. If Figma is the active app, sends Cmd+L to copy the current selection link
 * 2. Reads the clipboard
 * 3. Cleans the URL by removing tracking/session parameters
 * 4. Optionally shortens via fgma.cc (if enabled in preferences)
 * 5. Copies the final URL back to clipboard
 * 6. Shows a toast notification with the result
 *
 * Bind this to a hotkey (e.g., Control+L) for quick access!
 */

import { Clipboard, showToast, Toast } from "@raycast/api";
import {
  isFigmaFrontmost,
  sendCopyLinkKeystroke,
  AccessibilityPermissionError,
  sleep,
} from "./lib/applescript";
import { isFigmaUrl, cleanFigmaUrl } from "./lib/figma";
import { tryShortenUrl, isShortenerEnabled } from "./lib/shortener";

/** Delay after sending Cmd+L before reading clipboard (ms) */
const KEYSTROKE_DELAY = 350;

/** Number of retries if clipboard doesn't update */
const MAX_RETRIES = 1;

/**
 * Main command function - this runs when the user triggers the command.
 */
export default async function Command() {
  try {
    // Step 1: Check if Figma is the frontmost app
    const figmaIsActive = isFigmaFrontmost();

    // Step 2: Get current clipboard to detect changes later
    const clipboardBefore = await Clipboard.readText();

    // Step 3: If Figma is active, try to copy the selection link
    if (figmaIsActive) {
      const success = await tryCopyFromFigma(clipboardBefore);
      if (!success) {
        // tryCopyFromFigma shows its own error toast
        return;
      }
    }

    // Step 4: Read the clipboard (may have been updated by Figma)
    const clipboardText = await Clipboard.readText();

    // Step 5: Check if we have a Figma URL
    if (!clipboardText || !isFigmaUrl(clipboardText)) {
      // Different message depending on whether Figma was active
      if (figmaIsActive) {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Figma link found",
          message: "Try selecting a layer or frame first",
        });
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "No Figma link in clipboard",
          message: "Copy a Figma link first, or use this from Figma",
        });
      }
      return;
    }

    // Step 6: Clean the URL
    const cleanResult = cleanFigmaUrl(clipboardText);

    // Step 7: Try to shorten (if enabled in preferences)
    const shortenResult = await tryShortenUrl(cleanResult.cleanedUrl);

    // Step 8: Copy final URL to clipboard
    await Clipboard.copy(shortenResult.finalUrl);

    // Step 9: Show success toast
    if (shortenResult.wasShortened) {
      // Shortened successfully
      await showToast({
        style: Toast.Style.Success,
        title: "Short link copied",
        message: shortenResult.message,
      });
    } else if (isShortenerEnabled() && !shortenResult.wasShortened) {
      // Shortening was enabled but failed - show cleaned URL with warning
      await showToast({
        style: Toast.Style.Success,
        title: "Cleaned link copied",
        message: `${cleanResult.summary} (shortening unavailable)`,
      });
    } else {
      // Shortening disabled - just show cleaned result
      await showToast({
        style: Toast.Style.Success,
        title: cleanResult.wasModified
          ? "Cleaned Figma link copied"
          : "Figma link copied",
        message: cleanResult.summary,
      });
    }
  } catch (error) {
    // Handle known error types
    if (error instanceof AccessibilityPermissionError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Accessibility permission required",
        message:
          "System Settings → Privacy & Security → Accessibility → Enable Raycast",
      });
      return;
    }

    // Generic error handling
    const message = error instanceof Error ? error.message : "Unknown error";
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to clean link",
      message: message,
    });
  }
}

/**
 * Attempts to copy the current Figma selection link using Cmd+L.
 *
 * @param clipboardBefore - The clipboard content before attempting copy
 * @returns true if successful (clipboard was updated), false otherwise
 */
async function tryCopyFromFigma(
  clipboardBefore: string | undefined,
): Promise<boolean> {
  let attempts = 0;

  while (attempts <= MAX_RETRIES) {
    try {
      // Send Cmd+L to Figma
      sendCopyLinkKeystroke();

      // Wait for clipboard to update
      await sleep(KEYSTROKE_DELAY);

      // Check if clipboard changed
      const clipboardAfter = await Clipboard.readText();

      if (clipboardAfter && clipboardAfter !== clipboardBefore) {
        // Clipboard was updated - success!
        return true;
      }

      // If clipboard has a Figma URL already, consider it a success
      // (maybe Cmd+L copied the same link that was already there)
      if (clipboardAfter && isFigmaUrl(clipboardAfter)) {
        return true;
      }

      attempts++;

      if (attempts <= MAX_RETRIES) {
        // Wait a bit longer before retry
        await sleep(200);
      }
    } catch (error) {
      // Rethrow accessibility errors immediately
      if (error instanceof AccessibilityPermissionError) {
        throw error;
      }

      attempts++;

      if (attempts > MAX_RETRIES) {
        throw error;
      }
    }
  }

  // All retries exhausted - clipboard didn't update
  await showToast({
    style: Toast.Style.Failure,
    title: "Couldn't copy from Figma",
    message: "Select a layer/frame and try again",
  });

  return false;
}
