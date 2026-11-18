import { closeMainWindow, getPreferenceValues } from "@raycast/api";
import { handleRecognitionOutcome } from "./ocr/result";
import { RecognitionOutcome } from "./ocr/types";
import { recognize, showFailureToast } from "./utils";

export default async function command() {
  if (process.platform === "darwin") {
    const { recognizeTextFullscreenCommand } =
      await import("./ocr/macos-commands");
    return recognizeTextFullscreenCommand();
  }

  let outcome: RecognitionOutcome;
  const { includeRaycast } =
    getPreferenceValues<Preferences.RecognizeTextFullscreen>();
  try {
    if (!includeRaycast) await closeMainWindow();
    outcome = await recognize("fullscreen");
  } catch (error) {
    outcome = {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to recognize text",
    };
  }
  let closeFailed = false;
  let closeError: unknown;
  if (includeRaycast) {
    try {
      await closeMainWindow();
    } catch (error) {
      closeFailed = true;
      closeError = error;
    }
  }
  await handleRecognitionOutcome(outcome);
  if (closeFailed) {
    await showFailureToast(closeError, { title: "Could not close Raycast" });
  }
}
