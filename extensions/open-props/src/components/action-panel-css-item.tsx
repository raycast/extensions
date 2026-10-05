import { Action, ActionPanel, Keyboard } from "@raycast/api";

export function ActionPanelCssItem({ name, value }: { name: string; value: string }) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Paste">
        <Action.Paste title="Paste Variable" content={name} />
        {/* eslint-disable-next-line @raycast/prefer-title-case*/}
        <Action.Paste title="Paste as var()" content={`var(${name})`} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy">
        <Action.CopyToClipboard title="Copy Variable" content={name} shortcut={Keyboard.Shortcut.Common.CopyName} />
        <Action.CopyToClipboard
          // eslint-disable-next-line @raycast/prefer-title-case
          title="Copy as var()"
          content={`var(${name})`}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Value">
        <Action.Paste title="Paste Value" content={value} />
        <Action.CopyToClipboard title="Copy Value" content={value} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
