import { showToast, Toast, popToRoot } from "@raycast/api";
import {
  isKittyRunning,
  launchKittyApp,
  launchTab,
  activateKitty,
  isSocketAvailable,
  classifyError,
} from "./utils/kitty-remote";

export default async function command() {
  try {
    if (!isKittyRunning()) {
      // Launch Kitty — the first tab is created automatically
      await showToast({ style: Toast.Style.Animated, title: "Launching Kitty..." });
      launchKittyApp();
      await popToRoot();
      return;
    }

    if (!isSocketAvailable()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Socket not found",
        message: "Configure listen_on in kitty.conf and restart Kitty",
      });
      return;
    }

    launchTab();
    activateKitty();
    await popToRoot();
  } catch (error) {
    const kind = classifyError(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open tab",
      message: kind === "no_socket" ? "Socket not found — check kitty.conf" : String(error),
    });
  }
}
