import { useEffect, useState } from "react";
import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { isSwissInstalled } from "./swiss";

const INSTALL_COMMAND = "brew tap huseyinbabal/tap && brew install swiss";

/** Returns null while checking, then true/false once the swiss CLI presence is known. */
export function useSwissInstalled(): boolean | null {
  const [installed, setInstalled] = useState<boolean | null>(null);
  useEffect(() => {
    isSwissInstalled().then(setInstalled);
  }, []);
  return installed;
}

export function NotInstalled() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title="swiss CLI not found"
        description="This extension runs the swiss CLI locally. Install it with Homebrew, then reopen the command. If it lives in a custom path, set it in the extension preferences."
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy Install Command" content={INSTALL_COMMAND} icon={Icon.Clipboard} />
            <Action.OpenInBrowser title="Open Swiss on GitHub" url="https://github.com/huseyinbabal/swiss" />
            <Action
              title="Open Extension Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd"], key: "," }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
