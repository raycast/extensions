import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { OcrDomainError } from "./errors";

const CAPTURE_TIMEOUT_MS = 120_000;

let captureInFlight: Promise<Buffer> | null = null;

export async function captureSelectedArea(): Promise<Buffer> {
  if (captureInFlight) {
    return captureInFlight;
  }

  captureInFlight = captureSelectedAreaInternal();

  try {
    return await captureInFlight;
  } finally {
    captureInFlight = null;
  }
}

async function captureSelectedAreaInternal(): Promise<Buffer> {
  const temporaryPath = join(tmpdir(), `raycast-ocr-${randomUUID()}.png`);

  try {
    let captureError: unknown;

    try {
      await runScreenCapture(temporaryPath);
    } catch (error) {
      captureError = error;
    }

    const fileSize = await getFileSize(temporaryPath);

    if (fileSize === 0) {
      if (isLikelyCaptureCanceled(captureError)) {
        throw new OcrDomainError("capture_canceled", "Screenshot capture was canceled.", true);
      }

      throw new OcrDomainError("capture_failed", getCaptureFailureMessage(captureError), true);
    }

    return await readFile(temporaryPath);
  } finally {
    await removeTemporaryFile(temporaryPath);
  }
}

function runScreenCapture(outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("screencapture", ["-i", outputPath], { timeout: CAPTURE_TIMEOUT_MS }, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function getFileSize(path: string): Promise<number> {
  try {
    const fileStats = await stat(path);
    return fileStats.size;
  } catch {
    return 0;
  }
}

async function removeTemporaryFile(path: string): Promise<void> {
  try {
    await rm(path, { force: true });
  } catch {
    // Best-effort cleanup. The file is in the system temp directory and should normally be gone by here.
  }
}

function isLikelyCaptureCanceled(error: unknown): boolean {
  if (!error) {
    return true;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("cancel") || message.includes("user");
  }

  return false;
}

function getCaptureFailureMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("cannot run two interactive screen captures")) {
      return "A screenshot capture is already running. Wait for it to finish, then try again.";
    }

    if (message.includes("permission") || message.includes("not authorized") || message.includes("not allowed")) {
      return "Raycast could not capture the selected screen area. Enable Screen Recording for Raycast in System Settings and try again.";
    }
  }

  return "Raycast could not capture the selected screen area. Try again, or check Screen Recording permissions for Raycast in System Settings.";
}
