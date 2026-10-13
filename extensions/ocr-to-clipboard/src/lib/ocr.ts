import { Clipboard, environment, getPreferenceValues, showHUD } from "@raycast/api";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

/** Mirrors `OCRResult` in swift/Sources/OCRCore.swift. */
export type OCRResult = {
  text: string;
  lineCount: number;
  confidence: number;
  languages: string[];
  barcodes: string[];
};

/** Arguments shared by the Swift entry points, derived from the extension preferences. */
export type OCROptions = {
  languages: string[];
  autoDetectLanguage: boolean;
  mergeLines: boolean;
  tabBetweenColumns: boolean;
};

export function ocrOptionsFromPreferences(): OCROptions {
  const prefs = getPreferenceValues<Preferences>();
  const primary = prefs.primaryLanguage === "auto" ? [] : [prefs.primaryLanguage];
  return {
    languages: [...primary, ...parseLanguages(prefs.languages)],
    autoDetectLanguage: prefs.autoDetectLanguage,
    mergeLines: prefs.lineMode === "merge",
    tabBetweenColumns: prefs.columnSeparator !== "space",
  };
}

export function parseLanguages(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[,\s;]+/)
    .map((code) => code.trim())
    .filter(Boolean);
}

/** Text to put on the clipboard: recognized text, plus any QR/barcode payload not already in it. */
export function clipboardText(result: OCRResult): string {
  const text = result.text.trim();
  const extras = result.barcodes.filter((payload) => !text.includes(payload));
  return [text, ...extras].filter(Boolean).join("\n\n");
}

/** Copies the recognized text (optionally pastes it) and confirms with a sound and/or a HUD. */
export async function deliverToClipboard(result: OCRResult, subject = "line"): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  const text = clipboardText(result);

  if (!text) {
    await showHUD("No text found");
    return;
  }

  await Clipboard.copy(text);
  if (prefs.pasteAfterCopy) {
    await Clipboard.paste(text);
  }

  if (prefs.confirmation === "sound" || prefs.confirmation === "both") {
    playSound(prefs.sound);
  }
  if (prefs.confirmation === "hud" || prefs.confirmation === "both") {
    await showHUD(hudMessage(result, text, prefs.showPreview, subject));
  }
}

const SYSTEM_SOUNDS = "/System/Library/Components/CoreAudio.component/Contents/SharedSupport/SystemSounds";
const PRIVATE_FRAMEWORKS = "/System/Library/PrivateFrameworks";

/** Resolves a `sound` preference value to an audio file, falling back to a bundled sound. */
export function soundFile(name: string): string {
  const bundled = (file: string) => join(environment.assetsPath, file);
  const candidates: Record<string, string> = {
    screenshot: join(SYSTEM_SOUNDS, "system/Screen Capture.aif"),
    shutter: join(SYSTEM_SOUNDS, "system/Shutter.aif"),
    click: join(
      PRIVATE_FRAMEWORKS,
      "AccessibilitySupport.framework/Versions/A/Frameworks/AccessibilityKit.framework/Versions/A/Resources/Click.m4a",
    ),
    ack: join(PRIVATE_FRAMEWORKS, "IMDaemonCore.framework/Versions/A/Resources/Sent Acknowledgment.aiff"),
    capture: join(PRIVATE_FRAMEWORKS, "AccessibilitySharedSupport.framework/Versions/A/Resources/ax_vi_capture.wav"),
    chime: bundled("chime.wav"),
    blip: bundled("blip.wav"),
  };
  const file = candidates[name];
  return file && existsSync(file) ? file : bundled("chime.wav");
}

/** Plays a sound without waiting for it to finish. */
export function playSound(name: string): void {
  spawn("/usr/bin/afplay", [soundFile(name)], { detached: true, stdio: "ignore" }).unref();
}

export function hudMessage(result: OCRResult, text: string, showPreview: boolean, subject: string): string {
  const onlyBarcodes = result.lineCount === 0 && result.barcodes.length > 0;
  const count = onlyBarcodes
    ? `${result.barcodes.length} code${result.barcodes.length === 1 ? "" : "s"}`
    : `${result.lineCount} ${subject}${result.lineCount === 1 ? "" : "s"}`;

  if (!showPreview) {
    return `Copied ${count}`;
  }
  return `Copied ${count} · ${truncate(text.split("\n")[0], 60)}`;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
