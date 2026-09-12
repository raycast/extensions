import { useState } from "react";
import { ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { SupportedBrowsers } from "../../interfaces";
import { DEFAULT_ERROR_TITLE, DOWNLOAD_TEXT, INSTALL_COMMAND } from "../../constants";

export function NotInstalledError({ browser }: { browser: SupportedBrowsers }) {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <Detail
      actions={
        <ActionPanel>
          {!isLoading && INSTALL_COMMAND[browser] !== undefined && (
            <ActionPanel.Item
              title="Install with Homebrew"
              onAction={async () => {
                if (isLoading) return;

                setIsLoading(true);

                const toast = new Toast({ style: Toast.Style.Animated, title: "Installing..." });
                await toast.show();

                try {
                  execSync(INSTALL_COMMAND[browser] !== undefined ? INSTALL_COMMAND[browser] || "" : "");
                  await toast.hide();
                } catch {
                  await toast.hide();
                  await showToast(
                    Toast.Style.Failure,
                    DEFAULT_ERROR_TITLE,
                    "An unknown error occurred while trying to install",
                  );
                }
                setIsLoading(false);
              }}
            />
          )}
        </ActionPanel>
      }
      markdown={DOWNLOAD_TEXT[browser]}
    />
  );
}
