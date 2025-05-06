// src/speechocr.ts
import { environment, showToast, Toast, LocalStorage } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { execFileSync } from "child_process";
import path from "path";
import os from "os";

// Default speech rate if no setting is stored
const DEFAULT_RATE = 175;

async function getSpeechRate(): Promise<number> {
  const value = await LocalStorage.getItem<string>("speechRate");
  const parsed = parseInt(value || "");
  return isNaN(parsed) ? DEFAULT_RATE : parsed;
}

export default async function Command() {
  // 1) Run OCR using the Swift script
  let ocrText: string;
  try {
    const scriptPath = `${environment.assetsPath}/ocr.swift`;
    const stdout = execFileSync("/usr/bin/env", ["swift", scriptPath], {
      encoding: "utf8",
    });
    ocrText = stdout.trim();
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "OCR Failed",
      message,
    });
    return;
  }

  if (!ocrText) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Text Detected",
      message: "Try selecting a different area.",
    });
    return;
  }

  // 2) Get global speech rate
  const rate = await getSpeechRate();
  const audioPath = path.join(os.tmpdir(), "raycast-ocr.aiff");

  try {
    execFileSync("/usr/bin/env", ["say", "-r", rate.toString(), "-o", audioPath, ocrText], { encoding: "utf8" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "TTS Generation Failed",
      message,
    });
    return;
  }

  // 3) Play audio in QuickTime
  const appleScript = `
    tell application "QuickTime Player"
      open POSIX file ${JSON.stringify(audioPath)}
      activate
      tell document 1 to play
    end tell
  `;
  try {
    await runAppleScript(appleScript);
    await showToast({
      style: Toast.Style.Success,
      title: `🔊 Playing at ${rate} wpm`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Playback Failed",
      message,
    });
  }
}
