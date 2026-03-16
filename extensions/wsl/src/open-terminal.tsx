import { closeMainWindow, open, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { getPrefs } from "./lib/preferences";
import { isWindowsTerminalInstalled, openInWindowsTerminal } from "./lib/terminal";
import { isWslInstalled } from "./lib/wsl";

export default async function Command() {
  const wslAvailable = await isWslInstalled();
  if (!wslAvailable) {
    // Provide an actionable primary button directly on the toast so the user
    // can open the docs without leaving Raycast to hunt for the URL.
    await showToast({
      style: Toast.Style.Failure,
      title: "WSL Not Found",
      message: "Run `wsl --install` in PowerShell as Administrator, then restart.",
      primaryAction: {
        title: "Open WSL Docs",
        onAction: () => open("https://learn.microsoft.com/en-us/windows/wsl/install"),
      },
    });
    return;
  }

  if (!isWindowsTerminalInstalled()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Windows Terminal Not Found",
      message: "This command requires Windows Terminal to open WSL sessions.",
      primaryAction: {
        title: "Open Microsoft Store",
        onAction: () => open("ms-windows-store://pdp/?productid=9N0DX20HK701"),
      },
    });
    return;
  }

  const prefs = getPrefs();
  const distro = prefs.defaultDistro || undefined;
  const label = distro || "WSL";

  openInWindowsTerminal(distro);
  // closeMainWindow must come before showHUD; if the order is reversed the HUD
  // is swallowed by the window-close animation on some Raycast versions.
  await closeMainWindow();
  popToRoot();
  await showHUD(`Opened ${label} in Windows Terminal`);
}
