import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title="StoryTime Is Deprecated"
        description="StoryTime is deprecated and is being removed from the Raycast Store. You can uninstall this extension in Raycast Settings."
      />
    </List>
  );
}
