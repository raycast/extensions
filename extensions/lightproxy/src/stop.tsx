import { showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execPromise = promisify(exec);

export default async function Command() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Stopping LightProxy...",
    });

    const { stdout, stderr } = await execPromise("lightproxy stop");

    if (stderr && stderr.trim().length > 0 && !stderr.includes("No running LightProxy process found")) {
      throw new Error(stderr);
    }

    if (
      stdout.includes("No running LightProxy process found") ||
      stderr.includes("No running LightProxy process found")
    ) {
      await showHUD("LightProxy was not running");
    } else {
      await showHUD("LightProxy stopped successfully");
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop LightProxy",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
