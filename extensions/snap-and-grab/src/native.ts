import { environment, getPreferenceValues } from "@raycast/api";
import { launchCapture, listScreenshots, copyFiles } from "swift:../swift";
import { resolveConfiguration, type SnapPreferences } from "./config";
import type { Screenshot } from "./selection";

export function configuration() {
  return resolveConfiguration(getPreferenceValues<SnapPreferences>());
}

export async function captureScreenshot() {
  const config = configuration();
  await launchCapture(config.folder, environment.supportPath, config.previews, config.confirmationDuration);
}

export async function loadScreenshots(folder: string): Promise<{ folder: string; screenshots: Screenshot[] }> {
  return await listScreenshots(folder, 500);
}

export async function copyScreenshots(paths: string[]) {
  const config = configuration();
  await copyFiles(paths, environment.supportPath, config.confirmationDuration, config.previews);
}
