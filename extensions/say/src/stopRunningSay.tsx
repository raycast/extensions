import { LaunchProps, closeMainWindow } from "@raycast/api";
import { killRunningSay } from "./speech.js";

type LaunchContext = {
  shouldCloseMainWindow: boolean;
};

export default async function StopRunningSay({ launchContext }: LaunchProps<{ launchContext?: LaunchContext }>) {
  const shouldCloseMainWindow = launchContext?.shouldCloseMainWindow ?? true;
  try {
    if (shouldCloseMainWindow) await closeMainWindow();
    await killRunningSay();
  } catch {
    // Handle error gracefully
  }
}
