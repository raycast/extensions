import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { installWatchkey, isWatchkeyInstalled } from "./watchkey";

export function useInstallGuard() {
  const [installed, setInstalled] = useState(isWatchkeyInstalled());

  const installView = (
    <Detail
      markdown={`# watchkey not found

This extension requires [watchkey](https://github.com/Etheirystech/watchkey) to be installed.

Press **Enter** to install it automatically, or install manually:

\`\`\`bash
git clone https://github.com/Etheirystech/watchkey.git
cd watchkey
sudo make install
\`\`\`
`}
      actions={
        <ActionPanel>
          <Action
            title="Install Watchkey"
            onAction={async () => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Installing watchkey...",
                message: "Building from source",
              });
              try {
                await installWatchkey();
                toast.style = Toast.Style.Success;
                toast.title = "watchkey installed";
                setInstalled(true);
              } catch (error) {
                toast.style = Toast.Style.Failure;
                toast.title = "Installation failed";
                toast.message = error instanceof Error ? error.message : String(error);
              }
            }}
          />
          <Action.OpenInBrowser
            title="Open GitHub Repo"
            url="https://github.com/Etheirystech/watchkey"
          />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content="git clone https://github.com/Etheirystech/watchkey.git && cd watchkey && sudo make install"
          />
        </ActionPanel>
      }
    />
  );

  return { installed, installView };
}
