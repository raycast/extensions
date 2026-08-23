/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import { closeMainWindow, environment, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { chmod } from "fs/promises";
import { join } from "path";
import { x } from "tinyexec";

import { logError, logTrace } from "@/utils/logger";

const recognizeText = async () => {
  const command = join(environment.assetsPath, "recognizeText");
  await chmod(command, "755");
  const result = await x(command, [], {
    throwOnError: true,
  });
  return result.stdout.trim();
};

export default async function command() {
  if (process.platform !== "darwin") {
    return await showHUD("❌ OCR feature is currently only supported on macOS.");
  }

  await closeMainWindow();

  try {
    const recognizedText = await recognizeText();
    if (!recognizedText) {
      return await showHUD("❌ No text detected!");
    }
    logTrace("OCR", `recognized text: ${recognizedText}`);

    try {
      await launchCommand({
        name: "easydict",
        type: LaunchType.UserInitiated,
        arguments: {
          queryText: recognizedText,
        },
      });
    } catch (error) {
      logError("OCR", `launch easydict error: ${error}`);
      await showHUD("⚠️ Failed to query Easy Dictionary");
    }
  } catch (e) {
    logError("OCR", `recognize text error: ${e}`);
    await showHUD("❌ Failed detecting text");
  }
}
