import { showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Starting LightProxy...",
    });

    const { stderr } = await execPromise("lightproxy start");

    if (stderr && stderr.trim().length > 0) {
      throw new Error(stderr);
    }

    await showHUD("LightProxy started successfully");
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start LightProxy",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
