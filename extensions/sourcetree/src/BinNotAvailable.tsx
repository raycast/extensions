import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";
import { JSX } from "react";

interface BinNotAvailableProps {
  bin: string;
}

export function BinNotAvailable({ bin }: BinNotAvailableProps): JSX.Element {
  const message = [
    "# Unable to find Sourcetree command line tools",
    `The path for the command line tools are currently set to:`,
    `\`${bin}\``,
    `If you have installed Sourcetree via Homebrew, you can set the path to \`/opt/homebrew/bin/stree\` in the extension settings.`,
  ];

  return (
    <Detail
      markdown={message.join("\n\n")}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
