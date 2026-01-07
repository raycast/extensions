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
      await showFailureToast("No text detected", { title: "No text detected" });

      if (callbackOptions) {
        await callbackLaunchCommand(callbackOptions, {
          text: null,
          error: "No text detected",
        });
      }

      return;
    }

    if (callbackOptions) {
      await callbackLaunchCommand(callbackOptions, { text: recognizedText });
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
      });
    }
  }
}
