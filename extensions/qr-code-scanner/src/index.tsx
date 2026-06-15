import {
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  open,
  popToRoot,
  PopToRootType,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { exec } from "child_process";
import { constants } from "fs";
import { access, unlink } from "fs/promises";
import { Jimp } from "jimp";
import { randomInt } from "crypto";
import jsQR from "jsqr";
import { useEffect, useRef } from "react";

const NO_QR_FOUND_MESSAGE = "Found No Data in the QR Code :(";
const NO_QR_ANY_SCREEN_MESSAGE = "No QR Code Found on Any Screen :(";
const IMAGE_DECODING_ERROR_MESSAGE = "Image decoding error...";

function runCapture(command: string): Promise<Error | null> {
  return new Promise((resolve) => {
    exec(command, (exception) => {
      resolve(exception ?? null);
    });
  });
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function removeFile(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // Ignore cleanup errors.
  }
}

async function qrDecode(filepath: string): Promise<string | null> {
  try {
    const image = await Jimp.read(filepath);
    const result = jsQR(new Uint8ClampedArray(image.bitmap.data.buffer), image.bitmap.width, image.bitmap.height, {
      inversionAttempts: "attemptBoth",
    });

    if (result) {
      const decoder = new TextDecoder("shift-jis");
      return decoder.decode(Uint8Array.from(result.binaryData).buffer).trim();
    }
    return null;
  } catch (error) {
    const maybeErr = error as NodeJS.ErrnoException;
    if (maybeErr.code !== "ENOENT") {
      await showToast(Toast.Style.Failure, IMAGE_DECODING_ERROR_MESSAGE);
    }
    return null;
  } finally {
    await removeFile(filepath);
  }
}

function getOpenTarget(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    const safeProtocols = ["http:", "https:", "ftp:", "mailto:"];
    return safeProtocols.includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    const hasNoWhitespace = !/\s/.test(trimmed);
    const looksLikeDomain = /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed);
    if (!hasNoWhitespace || !looksLikeDomain) {
      return null;
    }

    try {
      const parsed = new URL(`https://${trimmed}`);
      return parsed.toString();
    } catch {
      return null;
    }
  }
}

async function trigger(randName: string, preferences: Preferences, displayNumber = 1): Promise<void> {
  closeMainWindow({ popToRootType: PopToRootType.Suspended });

  const filepath = `/tmp/shotTemp${randName}.jpg`;

  function captureScreenCommand(): string {
    switch (preferences.captureMode) {
      case "fullscreen":
        return `/usr/sbin/screencapture ${preferences.silence ? "-x" : ""} -D ${displayNumber.toString()} ${filepath}`;
      default:
        return `/usr/sbin/screencapture ${preferences.silence ? "-x" : ""} -i ${filepath}`;
    }
  }

  const exception = await runCapture(captureScreenCommand());
  const invalidDisplay = exception?.message.includes("Invalid display specified") ?? false;
  if (invalidDisplay) {
    await showHUD(NO_QR_ANY_SCREEN_MESSAGE);
    popToRoot();
    return;
  }

  const capturedFileExists = await fileExists(filepath);
  if (!capturedFileExists) {
    // Users can cancel interactive selection capture with ESC.
    popToRoot();
    return;
  }

  const data = await qrDecode(filepath);
  if (!data) {
    if (preferences.captureMode === "fullscreen") {
      await trigger(randName, preferences, displayNumber + 1);
      return;
    }
    await showHUD(NO_QR_FOUND_MESSAGE);
    popToRoot();
    return;
  }

  await Clipboard.copy(data);

  const openTarget = getOpenTarget(data);
  const shouldOpenAfterScan = preferences.openUrlAfterScan === true;
  if (shouldOpenAfterScan && openTarget !== null) {
    try {
      await open(openTarget);
      closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
      return;
    } catch {
      await showToast(Toast.Style.Failure, "Failed to open URL. Copied to clipboard instead.");
    }
  }

  await showHUD("Copied: " + (data.length > 20 ? data.substring(0, 30) + "..." : data));
  popToRoot();
}

export default function main() {
  const hasStartedRef = useRef(false);
  const preferences = getPreferenceValues<Preferences>();

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    const randName = randomInt(100, 999).toString();
    void trigger(randName, preferences);
  }, [preferences]);

  return null;
}
