import { closeMainWindow, LaunchProps } from "@raycast/api";
import { recognize } from "./utils";
import { handleRecognitionOutcome } from "./ocr/result";
import { LaunchContext } from "./types";
import { RecognitionOutcome } from "./ocr/types";

export default async function command({
  launchContext,
}: LaunchProps<{ launchContext?: LaunchContext }>) {
  let outcome: RecognitionOutcome;
  try {
    await closeMainWindow();
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
