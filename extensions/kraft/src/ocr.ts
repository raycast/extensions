/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  closeMainWindow,
  environment,
  launchCommand,
  LaunchType,
  PopToRootType,
  showHUD,
  updateCommandMetadata,
} from "@raycast/api";
import { spawnSync } from "child_process";
import fs from "fs";
import { readAppSettings } from "./hooks/useAppSettings";

async function fetchUnreadNotificationCount() {
  return 10;
}

function screencapture(file: string) {
  const { status, stdout, stderr } = spawnSync("/usr/sbin/screencapture", ["-i", file], { stdio: "ignore" });

  return status;
}

type CallbackType = "deeplink" | "launchCommand";

export default async function Command() {
  const settings = await readAppSettings();
  const callbackType: CallbackType = "deeplink";
  await closeMainWindow({ clearRootSearch: true });
  const ocrPath = `${environment.assetsPath}/ocr_img`;
  const binary = `${environment.assetsPath}/ocr`;
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const tmpFile = `${ocrPath}/${Date.now()}.png`;
  await fs.promises.mkdir(ocrPath, { recursive: true });
  try {
    await fs.promises.access(binary, fs.constants.X_OK);
  } catch {
    await fs.promises.chmod(binary, 0o775);
  }
  const captureStatus = screencapture(tmpFile);
  if (captureStatus === 0 && fs.existsSync(tmpFile)) {
    showHUD("Processing...");
    await delay(1);

    const { status, stderr } = spawnSync(binary, [
      ...(callbackType == "deeplink" ? ["deeplink", tmpFile] : [tmpFile]),
      settings.ocrLanguage,
      `"${settings.ocrCustomWords}"`,
      settings.ocrLevel,
      "input-picker",
    ]);
    if (status != 0) {
      showHUD(`OCR failed: ${stderr ? stderr.toString() : "unknown error"}`);
    } //  else {
    //   if (callbackType == "launchCommand") {
    //     await launchCommand({
    //       name: mode,
    //       type: LaunchType.UserInitiated,
    //       context: {
    //         txt: stdout.toString(),
    //         mode,
    //         img: tmpFile,
    //       },
    //     });
    //   }
    // }
  } else {
    showHUD("Capture cancelled");
  }
}
