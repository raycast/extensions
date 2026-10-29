import { Action, ActionPanel, Alert, confirmAlert, Icon, openExtensionPreferences } from "@raycast/api";
import { homedir } from "node:os";

import { FX_INSTALL_COMMAND, FX_INSTALLATION_URL, isFxNotInstalled, launchShellCommandInTerminal } from "../lib/fx";

export async function installFx() {
  const confirmed = await confirmAlert({
    title: "Install fx?",
    message:
      "This opens Terminal and runs the official installer from fx.sh. It installs to ~/.local/bin and may update your shell profile.",
    primaryAction: { title: "Install", style: Alert.ActionStyle.Default },
  });
  if (confirmed) {
    await launchShellCommandInTerminal(`cd -- '${homedir().replaceAll("'", `'"'"'`)}' && ${FX_INSTALL_COMMAND}`);
  }
}

export function FxErrorActions({ error, retry }: { error: unknown; retry?: () => void }) {
  const missing = isFxNotInstalled(error);

  return (
    <ActionPanel>
      {missing ? <Action title="Install Fx in Terminal" icon={Icon.Download} onAction={installFx} /> : null}
      {retry ? <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} /> : null}
      {missing ? <Action.CopyToClipboard title="Copy Install Command" content={FX_INSTALL_COMMAND} /> : null}
      <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      <Action.OpenInBrowser title="Open Fx Installation Documentation" url={FX_INSTALLATION_URL} />
    </ActionPanel>
  );
}
