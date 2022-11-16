import { Action, ActionPanel, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { useState } from "react";
import { PATH } from "../utils/displayplacer";

export function AutoInstall({
  onRefresh = () => {
    return;
  },
}) {
  const [isLoading, setIsLoading] = useState(false);
  return (
    <ActionPanel>
      {!isLoading && (
        <Action
          title="Install with Homebrew"
          onAction={async () => {
            if (isLoading) return;

            setIsLoading(true);

            const toast = await showToast({ style: Toast.Style.Animated, title: "Installing..." });
            await toast.show();

            try {
              execSync(`zsh -l -c 'PATH=${PATH} brew tap jakehilborn/jakehilborn && brew install displayplacer'`);
              await toast.hide();
              onRefresh();
            } catch (e) {
              await toast.hide();
              console.error(e);
              await showToast({
                style: Toast.Style.Failure,
                title: "Error",
                message: "An unknown error occured while trying to install",
              });
            }
            setIsLoading(false);
          }}
        />
      )}
    </ActionPanel>
  );
}
