import { LaunchType, closeMainWindow, launchCommand } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { imageDirectory } from "./engine";
import { discardImage } from "./history";

export default async function Command() {
  await closeMainWindow();
  await mkdir(imageDirectory, { recursive: true });
  const image = path.join(imageDirectory, `${randomUUID()}.png`);

  // Interactive selection; pressing Escape leaves no file behind.
  await new Promise<void>((resolve) => execFile("/usr/sbin/screencapture", ["-i", image], () => resolve()));
  if (!existsSync(image)) return;

  try {
    await launchCommand({ name: "translate", type: LaunchType.UserInitiated, context: { image } });
  } catch (error) {
    // The Translate command is turned off or missing; nothing will use the capture.
    await discardImage(image);
    await showFailureToast(error, { title: "Couldn’t Open Translate" });
  }
}
