import { Clipboard, closeMainWindow, launchCommand, LaunchType, open, showToast, Toast } from "@raycast/api";
import { recognizeTextInScreenRegion } from "./lib/screen-ocr";

/** Manifest name of the command that owns the search list. */
const SEARCH_WORD_COMMAND = "add-card";

const SCREEN_RECORDING_SETTINGS_URL = "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

/**
 * "Search Word from Screenshot" command — drags out a screen region, reads the
 * text in it with on-device OCR, and hands that text to "Search Word".
 *
 * For text that cannot be selected: video captions, PDFs, ebooks, video calls,
 * games. Draw the region around a single word and the search lands on it.
 */
export default async function searchScreenshotWord() {
  await closeMainWindow();

  const outcome = await recognizeTextInScreenRegion();

  switch (outcome.status) {
    // Esc during the drag means the user changed their mind, so say nothing.
    case "cancelled":
      return;
    case "recognized":
      return _searchRecognizedText(outcome.text);
    case "noTextFound":
      return _showNoTextFoundToast();
    case "blankCapture":
      return _showBlankCaptureToast();
    case "failed":
      return _showRecognitionFailedToast(outcome.errorMessage);
  }
}

/**
 * Hands the recognized text to the search list.
 *
 * Reason: `launchCommand` throws when Search Word is disabled, and by then the
 * capture is already spent, so offer the text as a copy the user can take
 * rather than making them drag the region again. The copy stays an explicit
 * choice, so screen text never lands in the clipboard on its own.
 */
async function _searchRecognizedText(recognizedText: string): Promise<void> {
  try {
    await launchCommand({
      name: SEARCH_WORD_COMMAND,
      type: LaunchType.UserInitiated,
      context: { screenshotText: recognizedText },
    });
  } catch {
    await _showSearchWordDisabledToast(recognizedText);
  }
}

async function _showSearchWordDisabledToast(recognizedText: string): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Search Word is disabled",
    message: `Enable the Search Word command to search "${recognizedText}"`,
    primaryAction: {
      title: "Copy Text",
      onAction: async (toast) => {
        await Clipboard.copy(recognizedText);
        await toast.hide();
      },
    },
  });
}

async function _showNoTextFoundToast(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "No text detected",
    message: "Try again with the region drawn tighter around the word",
  });
}

/**
 * Reason: a blank frame has two causes the user cannot tell apart, so name
 * both. macOS blanks DRM-protected video (Netflix, Apple TV+) before any
 * capture sees it, and a denied Screen Recording permission looks identical.
 */
async function _showBlankCaptureToast(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "The capture came back blank",
    message: "DRM-protected video always captures as black. Otherwise, check Screen Recording permission.",
    primaryAction: {
      title: "Open Screen Recording Settings",
      onAction: async (toast) => {
        await open(SCREEN_RECORDING_SETTINGS_URL);
        await toast.hide();
      },
    },
  });
}

async function _showRecognitionFailedToast(errorMessage: string): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "Couldn't read the screen",
    message: errorMessage,
  });
}
