import { Action, ActionPanel, Icon } from "@raycast/api";

export function ConnectAccountActions({ onConnect }: { onConnect: () => void }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          icon={Icon.Link}
          title="Connect Account"
          onAction={onConnect}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
