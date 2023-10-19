import { ActionPanel, Detail, List, Action } from "@raycast/api";

export default function SearchHistory() {
  return (
    <>
      <List.Item
        icon="list-icon.png"
        title="History page"
        actions={
          <ActionPanel>
            <Action.Push title="Show Details" target={<Detail markdown="# Hey! 👋" />} />
          </ActionPanel>
        }
      />
    </>
  );
}
