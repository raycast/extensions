import {
  closeMainWindow,
  getPreferenceValues,
  LaunchProps,
} from "@raycast/api";
import { recognize } from "./utils";
import { handleRecognitionOutcome } from "./ocr/result";
import { LaunchContext } from "./types";
import { RecognitionOutcome } from "./ocr/types";

export default async function command(
  props: LaunchProps<{ launchContext?: LaunchContext }>,
) {
  if (process.platform === "darwin") {
    const { recognizeTextCommand } = await import("./ocr/macos-commands");
    return recognizeTextCommand(props);
  }

  const { launchContext } = props;
  let outcome: RecognitionOutcome;
  try {
    const { closeRaycast } = getPreferenceValues<Preferences.RecognizeText>();

    if (closeRaycast) {
      await closeMainWindow();
    }
    outcome = await recognize("area");
  } catch (error) {
    outcome = {
      status: "error",
      message:
        error instanceof Error ? error.message : "Failed to recognize text",
    };
  }
  await handleRecognitionOutcome(outcome, {
    callbackOptions: launchContext?.callbackLaunchOptions,
  });
}
