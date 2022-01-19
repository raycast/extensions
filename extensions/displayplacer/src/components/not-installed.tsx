import { ActionPanel, ActionPanelItem, Detail, showToast, Toast, ToastStyle } from "@raycast/api";
import { execSync } from "child_process";
import { useState } from "react";

export default function NotInstalled({
  onRefresh = () => {
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
                  execSync(`zsh -l -c 'brew tap jakehilborn/jakehilborn && brew install displayplacer'`);
                  await toast.hide();
                  onRefresh();
                } catch {
                  await toast.hide();
                  await showToast(ToastStyle.Failure, "Error", "An unknown error occured while trying to install");
                }
                setIsLoading(false);
              }}
            />
          )}
        </ActionPanel>
      }
      markdown={`
# 🚨 Error: Displayplacer Utility is not installed
This extension depends on a command-line utilty that is not detected on your system. You must install it continue.

If you have homebrew installed, simply press **⏎** to have this extension install it for you.

To install homebrew, visit [this link](https://brew.sh)

Or, to install displayplacer manually, [click here](https://github.com/jakehilborn/displayplacer).
  `}
    />
  );
}
