import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { SlashCommand } from "../../utils/command";
import { formatCodeBlock } from "../../utils/markdown-formatter";
import { PasteAction } from "../../components/paste-action";

interface SlashCommandDetailProps {
  command: SlashCommand;
}

export default function CommandDetail({ command }: SlashCommandDetailProps) {
  const markdown = formatCodeBlock(command.content);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={command.name}
      actions={
        <ActionPanel>
          <PasteAction content={"/" + command.name} />
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={command.content}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
          <Action.ShowInFinder path={command.filePath} shortcut={{ modifiers: ["cmd", "shift"], key: "f" }} />
          <Action.OpenWith path={command.filePath} shortcut={{ modifiers: ["cmd"], key: "o" }} />
        </ActionPanel>
      }
    />
  );
}
