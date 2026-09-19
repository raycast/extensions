import { getPreferenceValues } from "@raycast/api";
import { homedir } from "node:os";
import path from "node:path";

export type PasteMode = "file" | "image";
export type AfterPaste = "save" | "discard";

export type ScreenshotPreferences = {
  screenshotDirectory: string;
  pasteMode: PasteMode;
  afterPaste: AfterPaste;
  captureDelayMs: number;
};

function expandHome(directory: string): string {
  if (directory === "~") {
    return homedir();
  }

  if (directory.startsWith("~/")) {
    return path.join(homedir(), directory.slice(2));
  }

  return directory;
}

function parseCaptureDelay(value: string): number {
  const delay = Number(value);
  return Number.isFinite(delay) && delay >= 0 ? Math.floor(delay) : 200;
}

export function getScreenshotPreferences(): ScreenshotPreferences {
  const preferences = getPreferenceValues<Preferences>();

  return {
    screenshotDirectory: expandHome(preferences.screenshotDirectory),
    pasteMode: preferences.pasteMode,
    afterPaste: preferences.afterPaste,
    captureDelayMs: parseCaptureDelay(preferences.captureDelayMs),
  };
}

export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
