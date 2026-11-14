import { closeMainWindow, open, showHUD } from "@raycast/api";
import { execFile } from "node:child_process";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { hasScreenCaptureAccess, recognizeCaptureWhenReady } from "swift:../swift";
import { deliverToClipboard, errorMessage, ocrOptionsFromPreferences, type OCRResult } from "./lib/ocr";

const execFileAsync = promisify(execFile);

const SCREEN_RECORDING_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

/** How long the recognizer waits for the user to finish selecting before giving up. */
const CAPTURE_TIMEOUT_SECONDS = 300;

/** Show "Recognizing…" only if recognition is still running after this delay. */
const PROGRESS_HUD_DELAY_MS = 400;

type Outcome = { ok: true; result: OCRResult } | { ok: false; error: unknown };

export default async function Command() {
  // Get Raycast out of the way before the crosshair appears.
  await closeMainWindow();

  if (!(await ensureScreenCaptureAccess())) {
    return;
  }

  const dir = await mkdtemp(join(tmpdir(), "raycast-ocr-"));
  const capture = join(dir, "capture.png");
  const readyMarker = join(dir, "ready");
  const cancelMarker = join(dir, "cancel");

  try {
    const options = ocrOptionsFromPreferences();

    // Start the recognizer now: it loads Vision while the user is still drawing the selection,
    // then waits for the marker that says the PNG is complete. The outcome is captured right away
    // so a rejection during the selection (timeout, spawn failure) is never left unhandled.
    const recognition: Promise<Outcome> = recognizeCaptureWhenReady(
      capture,
      readyMarker,
      cancelMarker,
      CAPTURE_TIMEOUT_SECONDS,
      options.languages,
      options.autoDetectLanguage,
      options.mergeLines,
      options.tabBetweenColumns,
    ).then(
      (result: OCRResult) => ({ ok: true, result }),
      (error: unknown) => ({ ok: false, error }),
    );

    const captured = await captureInteractively(capture);
    if (!captured) {
      await writeFile(cancelMarker, "");
      await recognition;
      return; // User pressed Esc.
    }

    await writeFile(readyMarker, "");
    const progress = setTimeout(() => void showHUD("Recognizing…"), PROGRESS_HUD_DELAY_MS);
    try {
      const outcome = await recognition;
      if (!outcome.ok) {
        throw outcome.error;
      }
      await deliverToClipboard(outcome.result);
    } finally {
      clearTimeout(progress);
    }
  } catch (error) {
    await showHUD(`OCR failed: ${errorMessage(error)}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Without Screen Recording permission, `screencapture` silently returns the wallpaper only.
 * Shows the system prompt the first time, then sends the user to the right Settings pane.
 */
async function ensureScreenCaptureAccess(): Promise<boolean> {
  if (await hasScreenCaptureAccess(true)) {
    return true;
  }
  await showHUD("Enable Raycast under Screen Recording, then run Capture Text again");
  await open(SCREEN_RECORDING_SETTINGS);
  return false;
}

/**
 * Opens the system region picker (same one as ⌘⇧4). Space switches to window mode.
 * Resolves to false when the user cancels: `screencapture` then exits non-zero and writes nothing.
 */
async function captureInteractively(destination: string): Promise<boolean> {
  try {
    // -i interactive, -x no shutter sound, -o no window shadow, -t png
    await execFileAsync("/usr/sbin/screencapture", ["-i", "-x", "-o", "-t", "png", destination]);
  } catch {
    // Cancelled, or capture failed: decided by whether a file exists.
  }
  try {
    await access(destination);
    return true;
  } catch {
    return false;
  }
}
