import { ActionPanel, List } from "@raycast/api";
import { ActionAddSite, ActionOpenPreferences } from "./actions";

export function EmptyView(props: { title: string }) {
  const { title } = props;
  return (
    <List.EmptyView
      title={title}
      icon={{ source: "no-view.png" }}
      actions={
        <ActionPanel>
          <ActionAddSite />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
