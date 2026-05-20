import { Action, ActionPanel, Icon } from "@raycast/api";
import { PostHogRegion } from "./account-model";

export function ConnectAccountActions({ onConnect }: { onConnect: (region: PostHogRegion) => void }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          icon={Icon.Link}
          title="Connect US Account"
          onAction={() => onConnect("us")}
          shortcut={{ modifiers: ["cmd"], key: "u" }}
        />
        <Action
          icon={Icon.Link}
          title="Connect EU Account"
          onAction={() => onConnect("eu")}
          shortcut={{ modifiers: ["cmd"], key: "e" }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
