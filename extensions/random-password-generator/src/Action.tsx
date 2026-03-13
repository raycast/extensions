import { ActionPanel, Action, Icon } from "@raycast/api";

export function Actions({ password, setShowingDetails }: { password: string; setShowingDetails: () => void }) {
  return (
    <ActionPanel title={password}>
      <ActionPanel.Section>
        <Action.CopyToClipboard content={password} title="Copy Password" shortcut={{ modifiers: ["cmd"], key: "." }} />
        <Action icon={Icon.QuestionMark} title="Toggle Detail" onAction={() => setShowingDetails()} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
