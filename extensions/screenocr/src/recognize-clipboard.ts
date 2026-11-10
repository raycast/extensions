import {
  closeMainWindow,
  getPreferenceValues,
  LaunchProps,
} from "@raycast/api";
import { handleRecognitionOutcome, ResultAction } from "./ocr/result";
import { RecognitionOutcome } from "./ocr/types";
import { LaunchContext } from "./types";
import { hideToast, recognize, showRecognizingToast } from "./utils";

export default async function command(
  props?: LaunchProps<{ launchContext?: LaunchContext }>,
) {
  const callbackOptions = props?.launchContext?.callbackLaunchOptions;
  let action: ResultAction | undefined;
  let outcome: RecognitionOutcome;
  try {
    await closeMainWindow();
    if (process.platform === "darwin") {
      const { recognizeClipboard } = await import("./ocr/macos");
      // Cross-extension callers receive the result directly and skip output UI.
      const toast = callbackOptions ? undefined : await showRecognizingToast();
      try {
        outcome = await recognizeClipboard();
      } finally {
        await hideToast(toast);
      }
      const { clipboardResultAction } =
        getPreferenceValues<Preferences.RecognizeClipboard>();
      action =
        clipboardResultAction === "paste-restore" ? "paste-restore" : "copy";
    } else {
      outcome = await recognize("clipboard");
    }
  } catch (error) {
    outcome = {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Failed to recognize clipboard image",
    };
  }
  await handleRecognitionOutcome(outcome, {
    subject: "recognizing clipboard image",
    callbackOptions,
    action,
  });
}
