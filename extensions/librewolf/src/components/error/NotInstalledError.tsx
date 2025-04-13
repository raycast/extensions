import { useState } from "react";
import { ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { DEFAULT_ERROR_TITLE, DownloadText } from "../../constants";
import { showFailureToast } from "@raycast/utils";

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
                  await showToast(
                    Toast.Style.Success,
                    "Installation Successful",
                    "Librewolf has been successfully installed",
                  );
                  await toast.hide();
                } catch (error) {
                  await toast.hide();
                  showFailureToast(error, {
                    title: DEFAULT_ERROR_TITLE,
                    message: "An unknown error occurred while trying to install",
                  });
                }
                setIsLoading(false);
              }}
            />
          )}
        </ActionPanel>
      }
      markdown={DownloadText}
    />
  );
}
