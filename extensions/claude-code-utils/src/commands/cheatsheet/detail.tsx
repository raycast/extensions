import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { PasteAction } from "../../components/paste-action";
import { CommandItem } from "../../constants/commands-data";
import {
  formatCodeBlock,
  formatContentMarkdown,
} from "../../utils/markdown-formatter";

interface CommandDetailProps {
  command: CommandItem;
}

export default function CommandDetail({ command }: CommandDetailProps) {
  // Build sections dynamically using push
  const sections: string[] = [];

  // Usage section (optional)
  if (command.usage) {
    sections.push("**Usage:**");
    sections.push(formatCodeBlock(command.usage));
    sections.push("&nbsp;"); // Non-breaking space for extra spacing
  }

  // Description section (required)
  sections.push(`**Description:**`);
  sections.push(command.description);
  sections.push("&nbsp;"); // Non-breaking space for extra spacing

  // Examples section (optional)
  if (command.examples && command.examples.length > 0) {
    sections.push("**Examples:**");
    command.examples.forEach((example) => {
      sections.push(formatCodeBlock(example));
    });
  }

  // Combine all sections
  const content = sections.join("\n\n");

  // Format with title using the utility function
  const markdown = formatContentMarkdown(command.name, content);

  return (
    <Detail
      markdown={markdown}
      navigationTitle={command.name}
      actions={
        <ActionPanel>
          <PasteAction content={command.usage || command.name} />
          <Action.CopyToClipboard
            title="Copy to Clipboard"
            content={command.usage || command.name}
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "enter" }}
          />
        </ActionPanel>
      }
    />
  );
}
