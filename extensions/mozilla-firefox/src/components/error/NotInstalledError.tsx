import { useState } from "react";
import { ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { runPowerShellScript } from "@raycast/utils";
import { promisify } from "util";
import { DEFAULT_ERROR_TITLE, DownloadText, DownloadTextWindows } from "../../constants";

const execAsync = promisify(exec);

export function NotInstalledError() {
  const [isLoading, setIsLoading] = useState(false);
  const isWindows = process.platform === "win32";

  async function handleInstall() {
    if (isLoading) return;

    setIsLoading(true);

    const toast = new Toast({ style: Toast.Style.Animated, title: "Installing..." });
    await toast.show();

    try {
      if (isWindows) {
        await runPowerShellScript("winget install Mozilla.Firefox");
      } else {
        await execAsync("brew install --cask firefox");
      }
      await toast.hide();
    } catch {
      await toast.hide();
      await showToast(Toast.Style.Failure, DEFAULT_ERROR_TITLE, "An unknown error occurred while trying to install");
    }
    setIsLoading(false);
  }

  return (
    <Detail
      actions={
        <ActionPanel>
          {!isLoading && (
            <ActionPanel.Item
              title={isWindows ? "Install with Winget" : "Install with Homebrew"}
              onAction={handleInstall}
            />
          )}
        </ActionPanel>
      }
      markdown={isWindows ? DownloadTextWindows : DownloadText}
    />
  );
}
