import { Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";
import { isSessionRunning, isTmuxInstalled, stop } from "./lib/opencode";
import { isTailscaleInstalled, stopServe } from "./lib/tailscale";

type Preferences = {
  port?: string;
};

function parsePort(rawPort?: string): number | null {
  const value = (rawPort ?? "4096").trim();

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  return port;
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const port = parsePort(preferences.port);

  if (port === null) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Invalid port",
      message: "Set a numeric port between 1 and 65535 in preferences.",
    });
    return;
  }

  if (!isTmuxInstalled()) {
    await showHUD("TailServe is not running (tmux not installed)");
    return;
  }

  if (!isSessionRunning(port)) {
    await showHUD("TailServe is not running");
    return;
  }

  if (isTailscaleInstalled()) {
    await stopServe(port);
  }
  await stop(port);

  await showHUD("TailServe stopped");
}
