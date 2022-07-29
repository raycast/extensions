import { ActionPanel, ActionPanelItem, Detail, showToast, Toast, ToastStyle } from "@raycast/api";
import { DEFAULT_ERROR_TITLE, DownloadMSEdgeMDText } from "../common/constants";
import { execSync } from "child_process";
import { useState } from "react";

export function NotInstalled({
  onInstall = () => {
    return;
  },
}) {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Detail
      actions={
        <ActionPanel>
          {!isLoading && (
            <ActionPanelItem
              title="Install with Homebrew"
              onAction={async () => {
                if (isLoading) return;

                setIsLoading(true);

                const toast = new Toast({ style: ToastStyle.Animated, title: "Installing..." });
                await toast.show();

                try {
                  execSync(`brew install --cask google-chrome`);
                  await toast.hide();
                  onInstall();
                } catch {
                  await toast.hide();
                  await showToast(
                    ToastStyle.Failure,
                    DEFAULT_ERROR_TITLE,
                    "An unknown error occurred while trying to install"
                  );
                }
                setIsLoading(false);
              }}
            />
          )}
        </ActionPanel>
      }
      markdown={DownloadMSEdgeMDText}
    />
  );
}
