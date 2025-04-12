import { useState } from "react";
import { ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { DEFAULT_ERROR_TITLE, DownloadText } from "../../constants";

export function NotInstalledError() {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Detail
      actions={
        <ActionPanel>
          {!isLoading && (
            <ActionPanel.Item
              title="Install with Homebrew"
              onAction={async () => {
                if (isLoading) return;

                setIsLoading(true);

                const toast = new Toast({ style: Toast.Style.Animated, title: "Installing..." });
                await toast.show();

                try {
                  execSync(`brew install --cask librewolf`);
                  await toast.hide();
                  await showToast(Toast.Style.Success, "LibreWolf installed successfully");
                } catch (error) {
                  await toast.hide();
                  await showFailureToast(error, { title: "Failed to install LibreWolf" });
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          )}
        </ActionPanel>
      }
      markdown={DownloadText}
    />
  );
}
