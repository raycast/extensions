import { showToast, Toast, showHUD } from "@raycast/api";
import { runLightproxyCommand } from "./utils";

export default async function Command() {
  try {
    const output = await runLightproxyCommand(["start"]);

    // Check if it was already running
    if (output.includes("already running")) {
      await showToast({
        style: Toast.Style.Success,
        title: "LightProxy",
        message: "Server was already running",
      });
    } else {
      await showToast({
        style: Toast.Style.Success,
        title: "LightProxy",
        message: "Server started successfully",
      });
    }

    await showHUD("LightProxy started");
  } catch (error) {
    console.error("Failed to start LightProxy:", error);

    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to start LightProxy",
      message: (error as Error).message,
    });
  }
}
