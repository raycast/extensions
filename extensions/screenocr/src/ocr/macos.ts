import { getPreferenceValues } from "@raycast/api";
import { getUserSelectedLanguages } from "../hooks";
import { CaptureMode, RecognitionOutcome } from "./types";

export function parseOutcome(value: string): RecognitionOutcome {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return invalidOutcome();
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return invalidOutcome();

  const result = parsed as Record<string, unknown>;
  const keys = Object.keys(result).sort();
  if (result.status === "recognized") {
    return keys.join(",") === "status,text" &&
      typeof result.text === "string" &&
      result.text.trim().length > 0
      ? { status: "recognized", text: result.text }
      : invalidOutcome();
  }
  if (result.status === "no-text" && keys.join(",") === "status")
    return { status: "no-text" };
  if (result.status === "cancelled" && keys.join(",") === "status")
    return { status: "cancelled" };
  if (result.status === "error") {
    return keys.join(",") === "message,status" &&
      typeof result.message === "string" &&
      result.message.length > 0
      ? { status: "error", message: result.message }
      : invalidOutcome();
  }
  return invalidOutcome();
}

function invalidOutcome(): RecognitionOutcome {
  return {
    status: "error",
    message: "The macOS OCR helper returned an invalid response",
  };
}

async function loadSwift() {
  return import("swift:../../swift");
}

export async function recognizeMacOS(
  mode: CaptureMode,
): Promise<RecognitionOutcome> {
  const preference = getPreferenceValues<Preferences>();
  const languages = (await getUserSelectedLanguages()).map(
    (language) => language.value,
  );
  const swift = await loadSwift();
  const customWords = preference.customWordsList
    ? preference.customWordsList.split(",")
    : [];

  try {
    const result =
      mode === "clipboard"
        ? await swift.recognizeClipboardText(
            preference.ocrMode === "fast",
            preference.languageCorrection,
            preference.ignoreLineBreaks,
            customWords,
            languages,
          )
        : await swift.recognizeText(
            mode === "fullscreen",
            preference.keepImage,
            preference.ocrMode === "fast",
            preference.languageCorrection,
            preference.ignoreLineBreaks,
            customWords,
            languages,
            Boolean(preference.playSound),
          );
    return parseOutcome(result);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to recognize text",
    };
  }
}

export async function detectBarcodeMacOS(): Promise<RecognitionOutcome> {
  const preference = getPreferenceValues<Preferences>();
  try {
    const swift = await loadSwift();
    return parseOutcome(
      await swift.detectBarcode(
        preference.keepImage,
        Boolean(preference.playSound),
      ),
    );
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to detect barcode",
    };
  }
}
