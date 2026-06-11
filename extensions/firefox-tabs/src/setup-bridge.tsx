import {
  launchCommand,
  LaunchType,
  open,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { installNativeHost } from "./lib/installer";
import { AMO_URL } from "./lib/constants";
import { isFirefoxRunning } from "./lib/errors";
import {
  generateManifest,
  getPort,
  isFirefoxInstalled,
  resolveNativeHostPath,
  validateManifest,
  verifyChain,
  writeManifest,
} from "./lib/setup";

export default async function Command() {
  try {
    // 1. Pre-flight: Firefox installed?
    if (!isFirefoxInstalled()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Firefox Not Detected",
        message: "Install Firefox first, then re-run this command.",
      });
      return;
    }

    // 2. Show animated toast and install native host
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing Firefox Bridge",
      message: "Downloading native host...",
    });

    try {
      await installNativeHost((message) => {
        toast.message = message;
      });
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Installation Failed";
      toast.message = err instanceof Error ? err.message : String(err);
      toast.primaryAction = {
        title: "Try Again",
        onAction: () => {
          launchCommand({
            name: "setup-bridge",
            type: LaunchType.UserInitiated,
          });
        },
      };
      return;
    }

    // 3. Resolve native host path (will now find ~/.raycast-firefox/bin/run.sh)
    let runShPath: string;
    try {
      runShPath = resolveNativeHostPath();
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Setup Failed";
      toast.message = err instanceof Error ? err.message : String(err);
      return;
    }

    // 4. Generate and write manifest
    let manifestPath: string;
    try {
      const manifestJson = generateManifest(runShPath);
      manifestPath = writeManifest(manifestJson);
    } catch {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't Write Manifest";
      toast.message =
        "Check permissions on ~/Library/Application Support/Mozilla/";
      return;
    }

    // 5. Validate manifest
    const validation = validateManifest(manifestPath, runShPath);
    if (!validation.valid) {
      toast.style = Toast.Style.Failure;
      toast.title = "Manifest Validation Failed";
      toast.message = validation.error ?? "Unknown validation error";
      return;
    }

    // 6. Chain verification with post-install guidance
    toast.message = "Verifying connection...";
    const port = getPort();
    const chain = await verifyChain(port);

    if (chain.reachable && chain.tabsOk) {
      // Full chain working
      await showHUD("Firefox integration ready!");
    } else if (chain.reachable && !chain.tabsOk) {
      // Host reachable but tabs fail -- extension not connected
      toast.style = Toast.Style.Success;
      toast.title = "Firefox Bridge Installed";
      toast.message = "Install the Firefox companion extension to connect";
      toast.primaryAction = {
        title: "Install Firefox Extension",
        onAction: () => {
          open(AMO_URL);
        },
      };
    } else if (!chain.reachable && isFirefoxRunning()) {
      // Host not reachable but Firefox IS running -- needs restart
      toast.style = Toast.Style.Success;
      toast.title = "Firefox Bridge Installed";
      toast.message = "Restart Firefox to activate the native host";
    } else {
      // Firefox not running
      toast.style = Toast.Style.Success;
      toast.title = "Firefox Bridge Installed";
      toast.message = "Open Firefox and install the companion extension";
      toast.primaryAction = {
        title: "Install Firefox Extension",
        onAction: () => {
          open(AMO_URL);
        },
      };
    }
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Setup Failed",
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
