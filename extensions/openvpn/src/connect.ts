import { runAppleScript } from "run-applescript";
import { Toast, closeMainWindow, showToast } from "@raycast/api";
import { isRunning, startOpenVPN, oneConfig } from "./utils";

export default async function Command() {
  const isOpenVPNRunning = await isRunning();
  const hasOnlyOneConfig = await oneConfig();

  if (!hasOnlyOneConfig) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to use OpenVPN Connect",
      message: "Extension supports only one configured profile for now.",
    });
    return;
  }

  await closeMainWindow();

  if (!isOpenVPNRunning) {
    await startOpenVPN();
  }

  const result = await runAppleScript(`
    delay 2
    try
      tell application "System Events" to tell process "OpenVPN Connect" to tell menu bar item 1 of menu bar 2
        click
        get menu items of menu 1
        try
          click menu item "Connect" of menu 1
        on error --menu item toggles between connect/disconnect
          key code 53 --escape key to close menu
        end try
      end tell
    on error
      return "error"
    end try
  `);

  if (result === "error") {
    await showToast({
      style: Toast.Style.Failure,
      title: "Unable to use OpenVPN Connect Menu Bar",
    });
  }
}
