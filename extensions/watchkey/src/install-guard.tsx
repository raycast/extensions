import { Action, ActionPanel, Detail } from "@raycast/api";
import { useState } from "react";
import { platform } from "node:os";
import { isWatchkeyInstalled } from "./watchkey";

const IS_WINDOWS = platform() === "win32";
const REPO_URL = IS_WINDOWS
  ? "https://github.com/Etheirystech/watchkey-win"
  : "https://github.com/Etheirystech/watchkey";
const INSTALL_CMD = IS_WINDOWS
  ? "git clone https://github.com/Etheirystech/watchkey-win.git && cd watchkey-win && cargo build --release"
  : "git clone https://github.com/Etheirystech/watchkey.git && cd watchkey && sudo make install";
const AUTH_METHOD = IS_WINDOWS ? "Windows Hello" : "Touch ID & Apple Watch";

export function useInstallGuard() {
  const [installed, setInstalled] = useState(isWatchkeyInstalled());

  const installView = (
    <Detail
      markdown={`# watchkey not found

This extension requires [watchkey](${REPO_URL}) to be installed.

It provides biometric authentication (${AUTH_METHOD}) for accessing secrets.

Press **Enter** to open the GitHub repo and follow the installation instructions.
`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open GitHub Repo" url={REPO_URL} />
          <Action.CopyToClipboard title="Copy Install Command" content={INSTALL_CMD} />
          <Action title="Check Again" onAction={() => setInstalled(isWatchkeyInstalled())} />
        </ActionPanel>
      }
    />
  );

  return { installed, installView };
}
