import { LaunchType, closeMainWindow, launchCommand } from "@raycast/api";
import { execFile } from "child_process";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { mkdir } from "fs/promises";
import path from "path";
import { imageDirectory } from "./engine";

export default async function Command() {
  await closeMainWindow();
  await mkdir(imageDirectory, { recursive: true });
  const image = path.join(imageDirectory, `${randomUUID()}.png`);

  // Interactive selection; pressing Escape leaves no file behind.
  await new Promise<void>((resolve) => execFile("/usr/sbin/screencapture", ["-i", image], () => resolve()));
  if (!existsSync(image)) return;

  await launchCommand({ name: "translate", type: LaunchType.UserInitiated, context: { image } });
}
