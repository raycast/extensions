import { List } from "@raycast/api";

export function EmptyRepositoryList() {
  return (
    <List>
      <List.EmptyView
        icon={{ source: "sourcetree_128x128x32.png" }}
        title="Is Sourcetree installed?"
        description="Alternatively, locate Sourcetree's Plist file and set it in the preferences."
      />
    </List>
  );
}
