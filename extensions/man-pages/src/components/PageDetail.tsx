import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { runCommand, openInTerminal } from "../utils";

export const PageDetail = ({ command, commandDetails }: { command: string; commandDetails: string }) => {
  // Divide content into sections and cleanse content
  const sections = commandDetails.split("\n\n").slice(1);
  const text = sections
    .map((section: string) => {
      const parts = section.split(" ");
      const name = "**" + parts[0].trim() + "**";
      return `${name != "****" ? name + "\n" : ""}\n${parts.slice(1).join(" ")}`;
    })
    .join("\n");

  // Display sections and provide quick actions
  return (
    <Detail
      markdown={`${text}`}
      isLoading={!commandDetails}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Entry to Clipboard"
            content={text}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action
            title="Open in Terminal"
            icon={Icon.Terminal}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={() => openInTerminal(command)}
          />
          <Action.OpenInBrowser url={`https://manpages.org/${command}`} shortcut={{ modifiers: ["cmd"], key: "b" }} />
          <Action
            title="View as PDF in Preview"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "p" }}
            onAction={() => {
              runCommand(`sw_vers -productVersion`, (os_version) => {
                if (parseFloat(os_version) < 13.0) {
                  runCommand(`man -t ${command} | open -f -a Preview`, () => null);
                } else {
                  runCommand(`mandoc -T pdf "$(/usr/bin/man -w ${command})" | open -fa Preview`, () => null);
                }
              });
            }}
          />
        </ActionPanel>
      }
    />
  );
};
