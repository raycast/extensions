import { Toast, showToast } from "@raycast/api";
import { execa } from "execa";
import { openAssetsMacOSApplication } from "~/utils/fs";

const indicatorAppName = "aperture-indicator";

export async function launchRecordingIndicator() {
  try {
    await openAssetsMacOSApplication(indicatorAppName);
  } catch {
    await showToast({ title: "Could not show recording indicator", style: Toast.Style.Failure });
  }
}

export async function killRecordingIndicator() {
  try {
    await execa("killall", [indicatorAppName]).catch(() => undefined);
  } catch {
    // ignore
  }
}
