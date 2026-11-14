import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openExtensionPreferences,
} from "@raycast/api";
import {
  CLI_DOCS,
  CLUELY_DASHBOARD,
  INSTALL_COMMAND,
  shellQuote,
} from "../lib/cluely";

export function Setup({
  message,
  cliPath,
  refresh,
  connected = false,
}: {
  message: string;
  cliPath?: string;
  refresh: () => void;
  connected?: boolean;
}) {
  const login = cliPath
    ? `${shellQuote(cliPath)} auth login`
    : "cluely auth login";
  const instructions = connected
    ? "Use Browse Meetings to read your meeting summaries and transcripts."
    : "1. Install the **official Cluely CLI**.\n2. Run its sign-in command in Terminal and complete the Cluely browser sign-in.\n3. Return here and refresh.\n\nThe CLI manages credentials in macOS Keychain. If you installed it elsewhere, set its absolute path in extension preferences.";
  return (
    <Detail
      markdown={`# Cluely connection\n\n${message}\n\n${instructions}`}
      actions={
        <ActionPanel>
          <Action
            title="Refresh Connection"
            icon={Icon.ArrowClockwise}
            onAction={refresh}
          />
          {!connected && (
            <Action.CopyToClipboard
              title="Copy Sign-In Command"
              content={login}
            />
          )}
          {!connected && (
            <Action.CopyToClipboard
              title="Copy Installation Command"
              content={INSTALL_COMMAND}
            />
          )}
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          <Action.OpenInBrowser
            title="Open Official CLI Guide"
            url={CLI_DOCS}
          />
          <Action.OpenInBrowser
            title="Open Cluely Dashboard"
            url={CLUELY_DASHBOARD}
          />
        </ActionPanel>
      }
    />
  );
}
