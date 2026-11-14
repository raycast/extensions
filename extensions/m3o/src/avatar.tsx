import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title="M3O Is Deprecated"
        description="M3O is deprecated and is being removed from the Raycast Store. You can uninstall this extension in Raycast Settings."
      />
    </List>
  );
}
