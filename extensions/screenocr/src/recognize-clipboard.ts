import { closeMainWindow } from "@raycast/api";
import { handleRecognitionOutcome } from "./ocr/result";
import { RecognitionOutcome } from "./ocr/types";
import { recognize } from "./utils";

export default async function command() {
  let outcome: RecognitionOutcome;
  try {
    await closeMainWindow();
    outcome =
      process.platform === "win32"
        ? await recognize("clipboard")
        : {
            status: "error",
            message: "Clipboard image OCR is available only on Windows",
          };
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
  });
}
