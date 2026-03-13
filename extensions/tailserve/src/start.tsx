import {
  Clipboard,
  Toast,
  getPreferenceValues,
  showHUD,
  showToast,
} from "@raycast/api";
import {
  isManagedAndHealthy,
  isOpenCodeInstalled,
  isTmuxInstalled,
  start,
  stop,
} from "./lib/opencode";
import {
  getServeUrl,
  isTailscaleConnected,
  isTailscaleInstalled,
  startServe,
} from "./lib/tailscale";

type Preferences = {
  port?: string;
  password?: string;
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

  if (!isTailscaleInstalled()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Tailscale is not installed",
      message:
        "Install it with `brew install tailscale` or tailscale.com/download.",
    });
    return;
  }

  if (!isOpenCodeInstalled()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "OpenCode is not installed",
      message: "Install OpenCode and ensure `opencode` is on your PATH.",
    });
    return;
  }

  if (!isTmuxInstalled()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "tmux is not installed",
      message: "Install it with `brew install tmux`.",
    });
    return;
  }

  const alreadyHealthy = await isManagedAndHealthy(port);
  if (alreadyHealthy) {
    const url = (await getServeUrl(port)) ?? `http://127.0.0.1:${port}`;
    await Clipboard.copy(url);
    await showHUD(`Already running - ${url} (copied)`);
    return;
  }

  if (!isTailscaleConnected()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Tailscale is not connected",
      message: "Run `tailscale up` and try again.",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting OpenCode server...",
  });

  const started = await start(port, preferences.password);
  if (!started) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to start OpenCode server";
    toast.message = "OpenCode did not become healthy within 10 seconds.";
    return;
  }

  const served = await startServe(port);
  if (!served) {
    await stop(port);
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to publish with Tailscale";
    toast.message = "`tailscale serve` returned a non-zero exit code.";
    return;
  }

  const url = (await getServeUrl(port)) ?? `http://127.0.0.1:${port}`;
  await Clipboard.copy(url);

  toast.style = Toast.Style.Success;
  toast.title = "TailServe started";
  toast.message = url;

  await showHUD(`Started - ${url} (copied)`);
}
