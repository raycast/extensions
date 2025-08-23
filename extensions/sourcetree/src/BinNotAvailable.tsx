import { Action, ActionPanel, Detail, openCommandPreferences } from "@raycast/api";

interface BinNotAvailableProps {
  bin: string;
}

export function BinNotAvailable({ bin }: BinNotAvailableProps) {
  const message = [
    "# Unable to find Sourcetree command line tools",
    `The path for the command line tools is currently set to:`,
    `\`${bin}\``,
    `If you have installed Sourcetree via Homebrew, you can set the path to \`/opt/homebrew/bin/stree\` in the extension settings.`,
  ];

  return (
    <Detail
      markdown={message.join("\n\n")}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}
