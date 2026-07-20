import { Clipboard, closeMainWindow, LaunchProps } from "@raycast/api";
import { callbackLaunchCommand } from "raycast-cross-extension";
import { recognizeText, showSuccessToast, showFailureToast } from "./utils";
import { OCRResult, LaunchContext } from "./types";

export default async function command({
  launchContext,
}: LaunchProps<{ launchContext?: LaunchContext }>) {
  await closeMainWindow();

  const callbackOptions = launchContext?.callbackLaunchOptions;

  try {
    const recognizedText = await recognizeText();

    if (!recognizedText) {
      await showFailureToast("No text detected", { title: "No text detected" });

      if (callbackOptions) {
        await callbackLaunchCommand(callbackOptions, {
          text: null,
          error: "No text detected",
        } satisfies OCRResult);
      }

      return;
    }

    if (callbackOptions) {
      await callbackLaunchCommand(callbackOptions, {
        text: recognizedText,
      } satisfies OCRResult);
      return;
    }

    await Clipboard.copy(recognizedText);
    await showSuccessToast("Copied text to clipboard");
  } catch (e) {
    console.error(e);
    await showFailureToast(e, { title: "Failed detecting text" });

    if (callbackOptions) {
      await callbackLaunchCommand(callbackOptions, {
        text: null,
        error: e instanceof Error ? e.message : "Failed detecting text",
      } satisfies OCRResult);
    }
  }
}
