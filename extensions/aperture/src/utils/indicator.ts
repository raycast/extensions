import { execa } from "execa";
import { openAssetsMacOSApplication } from "~/utils/fs";

const indicatorAppName = "aperture-indicator";

export async function launchRecordingIndicator() {
  return openAssetsMacOSApplication(indicatorAppName);
}

export async function killRecordingIndicator() {
  await execa("killall", [indicatorAppName]).catch(() => undefined);
}
