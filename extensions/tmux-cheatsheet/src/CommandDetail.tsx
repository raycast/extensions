import { Detail, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { TmuxCommand } from "./tmuxCommands";

interface CommandDetailProps {
  command: TmuxCommand;
}

export default function CommandDetail({ command }: CommandDetailProps) {
  const markdown = `
# ⚙️ ${command.id}
---

## 🧑‍💻 Terminal Command:
\`\`\`
${command.command}
\`\`\`

## ⌨️ Keyboard Shortcut & Usage:
${command.description}

${command.benefit ? `## 💡 Why Use This Command?\n${command.benefit}\n` : ""}

---

*Tip:* If you remap your prefix from \`<C-b>\` to \`<Leader>\`, substitute accordingly.
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={command.id}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Command"
            content={command.command}
            onCopy={async () => {
              await showToast({ style: Toast.Style.Success, title: "Command copied!" });
            }}
          />
        </ActionPanel>
      }
    />
  );
}
