import { showHUD, showToast, Toast } from "@raycast/api";
import { runCli } from "./utils";

export default async function RestartCommand() {
  await showToast({
    style: Toast.Style.Animated,
    title: "Restarting OpenClaw gateway…",
  });
  try {
    await runCli(["gateway", "restart", "--no-color"]);
    await showHUD("OpenClaw gateway restarted");
  } catch (error) {
    await showHUD(error instanceof Error ? error.message : "Restart failed");
  }
}
