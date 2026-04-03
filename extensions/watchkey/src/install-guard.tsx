import { Action, ActionPanel, Detail } from "@raycast/api";
import { useState } from "react";
import { isWatchkeyInstalled } from "./watchkey";

export function useInstallGuard() {
  const [installed, setInstalled] = useState(isWatchkeyInstalled());

  const installView = (
    <Detail
      markdown={`# watchkey not found

This extension requires [watchkey](https://github.com/Etheirystech/watchkey) to be installed.

Press **Enter** to open the GitHub repo and follow the installation instructions.
`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open GitHub Repo" url="https://github.com/Etheirystech/watchkey" />
          <Action.CopyToClipboard
            title="Copy Install Command"
            content="git clone https://github.com/Etheirystech/watchkey.git && cd watchkey && sudo make install"
          />
          <Action title="Check Again" onAction={() => setInstalled(isWatchkeyInstalled())} />
        </ActionPanel>
      }
    />
  );

  return { installed, installView };
}
