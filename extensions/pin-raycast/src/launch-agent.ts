import { showHUD, showToast, Toast } from "@raycast/api";
import { launchAgent, isAgentRunning } from "./utils/agent-ipc";

export default async function Command() {
  const running = await isAgentRunning();

  if (running) {
    await showHUD("Agent already running");
    return;
  }

  const success = await launchAgent();

  if (success) {
    await showHUD("Agent launched");
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Launch Agent",
      message: "Make sure Pin.app is installed",
    });
  }
}
