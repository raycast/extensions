import { Action, ActionPanel } from "@raycast/api";

export function generateActionPanel(chatCode: string, chatCodeEscaped: string, hexCode?: string) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.CopyToClipboard content={chatCode} title="Copy Chat Code" />
        <Action.CopyToClipboard content={chatCodeEscaped} title="Copy Escaped Chat Code" />
        {hexCode && <Action.CopyToClipboard content={hexCode} title="Copy Hex Code" />}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
