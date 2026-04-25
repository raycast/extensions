import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import ShortenCommand from "@/commands/shorten";

export function EmptyLinks() {
  const { push } = useNavigation();
  return (
    <List.EmptyView
      icon={Icon.Link}
      title="No links yet"
      description="Shorten your first URL to get started."
      actions={
        <ActionPanel>
          <Action
            title="Shorten a Link"
            icon={Icon.Plus}
            onAction={() => push(<ShortenCommand />)}
          />
        </ActionPanel>
      }
    />
  );
}
