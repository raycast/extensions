import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { runCommand, openInTerminal } from "../utils";

export const PageDetail = ({ command, commandDetails }: { command: string; commandDetails: string }) => {
  // Divide content into sections and cleanse content
  const title = (commandDetails.split("\n")[0].match(/[A-Za-z.]+/g) || ["MAN"])[0];
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
          <Action.CopyToClipboard title="Copy Entry to Clipboard" content={text} />
          <Action title="Open in Terminal" icon={Icon.Terminal} onAction={() => openInTerminal(command)} />
          <Action.OpenInBrowser url={`https://manpages.org/${command}`} />
          <Action
            title="View as PDF in Preview"
            icon={Icon.Document}
            onAction={() => runCommand(`man -t ${command} | open -f -a Preview`, () => null)}
          />
        </ActionPanel>
      }
    />
  );
};
