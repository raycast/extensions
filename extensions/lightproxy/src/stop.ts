import { showToast, Toast, showHUD } from "@raycast/api";
import { runLightproxyCommand } from "./utils";

export default async function Command() {
  try {
    const output = await runLightproxyCommand(["stop"]);

    // Check if it was not running
    if (output.includes("No running")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "LightProxy",
        message: "No running LightProxy server found",
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: "LightProxy",
        message: "Server stopped successfully",
      });
    }

    await showHUD("LightProxy stopped");
  } catch (error) {
    console.error("Failed to stop LightProxy:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop LightProxy",
      message: (error as Error).message,
    });
  }
}
