import { ActionPanel, List, Action, Icon } from "@raycast/api";

export default function Command() {
  return (
    <List searchBarPlaceholder="Select an option...">
      <List.Item
        title="Fix english sentence"
        icon={Icon.Globe}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://chatgpt.com/g/g-674b1c070a28819193b1e8b6ceb4ba8a-fix-the-sentence-in-english?temporary-chat=true" />
          </ActionPanel>
        }
      />
      <List.Item
        title="Translate into english"
        icon={Icon.Code}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://chatgpt.com/g/g-6748857f891c819185fa252c4fdfc82b-translate-into-english?temporary-chat=true" />
          </ActionPanel>
        }
      />
      <List.Item
        title="Translate into spanish"
        icon={Icon.Code}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url="https://chatgpt.com/g/g-674882f905f48191888d665681603b65-translate-into-spanish?temporary-chat=true" />
          </ActionPanel>
        }
      />
    </List>
  );
}
