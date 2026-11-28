import { spawn } from "node:child_process";
import fs from "node:fs";
import { copyPngToPasteboard, recognizeText, renderTextOverlay } from "swift:../../swift";

import { runCommand as execFileAsync } from "./command-runner";

export interface TextOverlayLayerInput {
  text: string;
  fontFamily: string;
  fontSize: number;
  fillHex: string;
  strokeHex: string;
  yOffset: number;
  alignTop: boolean;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function renderTransparentTextOverlayPng(
  width: number,
  height: number,
  layers: TextOverlayLayerInput[],
  outPngPath: string,
): Promise<void> {
  try {
    await renderTextOverlay(Math.round(width), Math.round(height), layers, outPngPath);
  } catch (error) {
    throw new Error(`Couldn't render the subtitle text overlay: ${errorMessage(error)}`);
  }
  if (!fs.existsSync(outPngPath)) {
    throw new Error("Couldn't render the subtitle text overlay: the output image was not created.");
  }
}

export async function recognizeSubtitleBitmapOcr(_supportPath: string, bitmapPngPath: string): Promise<string | null> {
  if (!fs.existsSync(bitmapPngPath)) return null;
  try {
    const text = await recognizeText(bitmapPngPath);
    return (text ?? "").trim() || null;
  } catch {
    return null;
  }
}

const CLIPBOARD_SCRIPT = `on run argv
  set the clipboard to (read (POSIX file (item 1 of argv)) as «class PNGf»)
end run`;

export async function copyPngToClipboard(_supportPath: string, pngPath: string): Promise<void> {
  if (!fs.existsSync(pngPath)) return;

  try {
    await copyPngToPasteboard(pngPath);
    return;
  } catch {
    // Fall through to AppleScript
  }

  await execFileAsync("/usr/bin/osascript", ["-e", CLIPBOARD_SCRIPT, pngPath], { timeout: 5000 }).catch(
    () => undefined,
  );
}

export function playCompletionChime(): void {
  try {
    const child = spawn("/usr/bin/afplay", ["/System/Library/Sounds/Glass.aiff"], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Ignore audio errors
  }
}

const NOTIFICATION_SCRIPT = `on run argv
  display notification (item 2 of argv) with title (item 1 of argv)
end run`;

export function postMacNotification(title: string, message: string): void {
  try {
    const child = spawn("/usr/bin/osascript", ["-e", NOTIFICATION_SCRIPT, title, message.replace(/\n/g, " · ")], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Ignore notification errors
  }
}
