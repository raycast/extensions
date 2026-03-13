import {
  Clipboard,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import { isHealthy, isSessionRunning, isTmuxInstalled } from "./lib/opencode";
import { getServeUrl, isTailscaleInstalled } from "./lib/tailscale";

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
    await showHUD("Not running (tmux not installed)");
    return;
  }

  const sessionRunning = isSessionRunning(port);
  const healthy = await isHealthy(port);

  if (sessionRunning && healthy) {
    if (isTailscaleInstalled()) {
      const url = (await getServeUrl(port)) ?? `http://127.0.0.1:${port}`;
      await Clipboard.copy(url);
      await showHUD(`Running - ${url} (copied)`);
    } else {
      await Clipboard.copy(`http://127.0.0.1:${port}`);
      await showHUD(`Running locally on port ${port} (copied)`);
    }
    return;
  }

  if (sessionRunning) {
    await showHUD("Session exists but not healthy");
    return;
  }

  await showHUD("Not running");
}
