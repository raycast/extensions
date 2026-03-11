import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { Documents } from "./views/documents";
import { Ids } from "./views/ids";

export default function Command() {
  const { push } = useNavigation();

  return (
    <List navigationTitle="Search for a feature" searchBarPlaceholder="Search">
      <List.Item
        title="Generate documents"
        icon={Icon.AddPerson}
        actions={
          <ActionPanel>
            <Action title="Generate Random Documents" onAction={() => push(<Documents />)} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Generate IDs"
        icon={Icon.MemoryChip}
        actions={
          <ActionPanel>
            <Action title="Generate Random IDs" onAction={() => push(<Ids />)} />
          </ActionPanel>
        }
      />
    </List>
  );
}
