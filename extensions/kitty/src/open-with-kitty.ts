import { execSync } from "child_process";
import { showToast, Toast, popToRoot } from "@raycast/api";
import {
  isKittyRunning,
  launchKittyApp,
  launchWindow,
  activateKitty,
  isSocketAvailable,
  classifyError,
} from "./utils/kitty-remote";

function getFinderSelection(): string | null {
  try {
    const script = `
      tell application "Finder"
        if (count of Finder windows) > 0 then
          set currentFolder to (target of front Finder window) as alias
          return POSIX path of currentFolder
        else
          return POSIX path of (desktop as alias)
        end if
      end tell
    `;
    const result = execSync(`osascript -e '${script.replace(/'/g, "'\\''")}'`, {
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

export default async function command() {
  try {
    const folder = getFinderSelection();
    if (!folder) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No folder selected",
        message: "Open a folder in Finder first",
      });
      return;
    }

    if (!isKittyRunning()) {
      await showToast({ style: Toast.Style.Animated, title: "Launching Kitty...", message: folder });
      launchKittyApp(["--directory", folder]);
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

    launchWindow({ cwd: folder });
    activateKitty();
    await popToRoot();
  } catch (error) {
    const kind = classifyError(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open folder",
      message: kind === "no_socket" ? "Socket not found — check kitty.conf" : String(error),
    });
  }
}
