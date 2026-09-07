import { Clipboard, getPreferenceValues } from "@raycast/api";
import { callbackLaunchCommand } from "raycast-cross-extension";
import { OCRResult } from "../types";
import { showFailureToast, showSuccessToast } from "../utils";
import { RecognitionOutcome } from "./types";

type CallbackOptions = Parameters<typeof callbackLaunchCommand>[0];
type ResultAction = "copy" | "paste" | "both";

export async function handleRecognitionOutcome(
  outcome: RecognitionOutcome,
  options: {
    callbackOptions?: CallbackOptions;
    subject?: string;
    noResultTitle?: string;
    action?: ResultAction;
  } = {},
): Promise<void> {
  if (options.callbackOptions) {
    const result: OCRResult =
      outcome.status === "recognized"
        ? { text: outcome.text }
        : outcome.status === "cancelled"
          ? { text: null, error: "Recognition cancelled" }
          : outcome.status === "no-text"
            ? { text: null, error: "No text detected" }
            : { text: null, error: outcome.message };
    // Keep callback delivery outside command recognition catches. A delivery
    // failure must never cause a second callback attempt.
    try {
      await callbackLaunchCommand(options.callbackOptions, result);
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to return recognition result",
      });
    }
    return;
  }

  if (outcome.status === "cancelled") return;
  if (outcome.status === "no-text") {
    const title = options.noResultTitle ?? "No text detected";
    await showFailureToast(title, { title });
    return;
  }
  if (outcome.status === "error") {
    await showFailureToast(outcome.message, {
      title: options.subject
        ? `Failed ${options.subject}`
        : "Failed detecting text",
    });
    return;
  }

  const preference = getPreferenceValues<Preferences>();
  const action =
    options.action ??
    (preference.resultAction === "paste" || preference.resultAction === "both"
      ? preference.resultAction
      : "copy");
  if (action === "copy") {
    try {
      await Clipboard.copy(outcome.text);
      await showSuccessToast("Copied text to clipboard");
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to copy recognized text",
      });
    }
    return;
  }

  if (action === "paste") {
    try {
      await Clipboard.paste(outcome.text);
      await showSuccessToast("Pasted recognized text");
    } catch (error) {
      await showFailureToast(error, {
        title: "Failed to paste recognized text",
      });
    }
    return;
  }

  try {
    await Clipboard.copy(outcome.text);
  } catch (error) {
    await showFailureToast(error, { title: "Failed to copy recognized text" });
    return;
  }
  try {
    await Clipboard.paste(outcome.text);
    await showSuccessToast("Copied and pasted recognized text");
  } catch (error) {
    await showFailureToast(error, {
      title: "Text was copied, but could not be pasted",
    });
  }
}
