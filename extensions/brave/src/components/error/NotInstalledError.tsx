import { useState } from "react";
import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { failToast } from "@chrismessina/raycast-kit";
import { isWindows } from "../../util/platform";

export function NotInstalledError() {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Detail
      isLoading={isLoading}
      markdown="# Brave was not found\nInstall the selected Brave browser channel or set its executable path in extension preferences."
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Download Brave" url="https://brave.com/download/" />
          {!isWindows && (
            <Action
              title="Install with Homebrew"
              onAction={async () => {
                if (isLoading) return;
                setIsLoading(true);
                const toast = await showToast({ style: Toast.Style.Animated, title: "Installing Brave�" });
                try {
                  await promisify(execFile)("/bin/zsh", ["-lc", "brew install --cask brave-browser"]);
                  toast.style = Toast.Style.Success;
                  toast.title = "Installed! Go Back and Try Again";
                } catch (error) {
                  failToast(toast, error, { title: "Could Not Install Brave" });
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
