import { Clipboard, closeMainWindow, LaunchProps } from "@raycast/api";
import { LaunchOptions, callbackLaunchCommand } from "raycast-cross-extension";
import { recognizeText, showSuccessToast, showFailureToast } from "./utils";

type LaunchContext = {
  callbackLaunchOptions?: LaunchOptions;
};

export default async function command({
  launchContext,
}: LaunchProps<{ launchContext?: LaunchContext }>) {
  await closeMainWindow();

  const callbackOptions = launchContext?.callbackLaunchOptions;

  try {
    const recognizedText = await recognizeText();

    if (!recognizedText) {
      await showFailureToast("No text detected");
      // If there's a callback, send empty result back
      if (callbackOptions) {
        await callbackLaunchCommand(callbackOptions, {
          text: null,
          error: "No text detected",
        });
      }
      return;
    }

    // If called from another extension with callback, send result back
    if (callbackOptions) {
      await callbackLaunchCommand(callbackOptions, { text: recognizedText });
    } else {
      // Standard behavior: copy to clipboard
      await Clipboard.copy(recognizedText);
      await showSuccessToast("Copied text to clipboard");
    }
  } catch (e) {
    console.error(e);
    await showFailureToast("Failed detecting text");
    // If there's a callback, send error back
    if (callbackOptions) {
      await callbackLaunchCommand(callbackOptions, {
        text: null,
        error: e instanceof Error ? e.message : "Failed detecting text",
      });
    }
  }
}
