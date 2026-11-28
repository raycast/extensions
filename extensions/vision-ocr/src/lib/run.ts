import { Clipboard, closeMainWindow, getPreferenceValues, open, showHUD } from "@raycast/api";
import { Page, formatText } from "./format";

/** What the Swift side returns. Mirrors `OCRResult` in swift/Sources/VisionOCR/VisionOCR.swift. */
export type OCRResult = {
  status: "ok" | "cancelled" | "noImage" | "noPermission" | "unreadable";
  pages: Page[];
};

export type OCROptions = {
  languages: string[];
  fast: boolean;
  languageCorrection: boolean;
  customWords: string[];
  detectBarcodes: boolean;
};

const SCREEN_RECORDING_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture";

const FAST_LANGUAGES = ["en-US", "fr-FR", "it-IT", "de-DE", "es-ES", "pt-BR"];

export function ocrOptions(): OCROptions {
  const prefs = getPreferenceValues<Preferences>();
  const languages = [prefs.language, prefs.secondLanguage].filter((code) => code && code !== "auto" && code !== "none");
  return {
    languages: [...new Set(languages)],
    // Vision's fast recognizer only knows these languages; anything else needs the accurate one.
    fast: prefs.accuracy === "fast" && languages.every((code) => FAST_LANGUAGES.includes(code)),
    languageCorrection: prefs.languageCorrection,
    customWords: (prefs.customWords ?? "")
      .split(",")
      .map((word) => word.trim())
      .filter(Boolean),
    detectBarcodes: prefs.detectBarcodes,
  };
}

const preview = (text: string) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 48 ? `${flat.slice(0, 47)}…` : flat;
};

const MESSAGES: Record<Exclude<OCRResult["status"], "ok">, string> = {
  cancelled: "",
  noImage: "No image on the clipboard",
  unreadable: "Couldn't open that file as an image or PDF",
  noPermission: "Allow Raycast to record the screen, then try again",
};

/**
 * Shared flow for every command: recognize, format, then copy, append or paste,
 * and confirm with a single HUD.
 */
export async function run(recognize: () => Promise<OCRResult>) {
  const prefs = getPreferenceValues<Preferences>();
  const format = prefs.format;

  let result: OCRResult;
  try {
    result = await recognize();
  } catch (error) {
    await showHUD(`Text recognition failed: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  if (result.status === "noPermission") {
    await open(SCREEN_RECORDING_SETTINGS);
    await showHUD(MESSAGES.noPermission);
    return;
  }
  if (result.status !== "ok") {
    if (MESSAGES[result.status]) await showHUD(MESSAGES[result.status]);
    return;
  }

  const text = formatText(result.pages, format, {
    keepIndentation: prefs.keepIndentation,
    plainPunctuation: prefs.plainPunctuation,
  });
  if (!text) {
    await showHUD(
      format === "links" ? "No links found" : format === "emails" ? "No email addresses found" : "No text found",
    );
    return;
  }

  switch (prefs.afterRecognition) {
    case "paste":
      await Clipboard.paste(text);
      await showHUD(`Pasted “${preview(text)}”`);
      return;
    case "append": {
      // When the clipboard holds a file (the image just recognized), there is no text to append to.
      const current = await Clipboard.read();
      const existing = current.file ? undefined : current.text?.trimEnd();
      await Clipboard.copy(existing ? `${existing}\n${text}` : text);
      await showHUD(`Appended “${preview(text)}”`);
      return;
    }
    default:
      await Clipboard.copy(text);
      await showHUD(`Copied “${preview(text)}”`);
  }
}

/** Hides Raycast first so it isn't in the way of the capture or the paste target. */
export async function hideRaycast() {
  await closeMainWindow({ clearRootSearch: true });
}
