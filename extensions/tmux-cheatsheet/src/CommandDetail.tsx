import { Detail, ActionPanel, Action } from "@raycast/api";
import { TmuxCommand } from "./tmuxCommands";
import { prettifyKey } from "./formatKeys";

interface CommandDetailProps {
  command: TmuxCommand;
  prefix: string;
}

export default function CommandDetail({ command, prefix }: CommandDetailProps) {
  const shortcutDisplay = command.shortcut ? `${prettifyKey(prefix)} ${prettifyKey(command.shortcut)}` : "None";

  const shortcutSection = command.shortcut
    ? `## ⌨️ Shortcut:\n\`${shortcutDisplay}\``
    : `## ⌨️ Shortcut:\nNo default shortcut`;

  const markdown = `
# ⚙️ ${command.id}
---

## 🧑‍💻 Terminal Command:
\`\`\`
${command.command}
\`\`\`

${shortcutSection}

${command.benefit ? `## 💡 Why Use This Command?\n${command.benefit}\n` : ""}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={command.id}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Command" content={command.command} />
          <Action.Paste title="Paste to Terminal" content={command.command} />
        </ActionPanel>
      }
    />
  );
}
