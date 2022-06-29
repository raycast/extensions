import { ActionPanel, Grid, List } from "@raycast/api";
import { ActionOpenPreferences } from "./action-open-preferences";

export function EmptyView(props: { layout: string }) {
  const { layout } = props;
  return layout === "List" ? (
    <List.EmptyView
      title={"No Font"}
      icon={{ source: { light: "empty-icons/empty-icon.svg", dark: "empty-icons/empty-icon@dark.svg" } }}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      title={"No Font"}
      icon={{ source: { light: "empty-icons/empty-icon.svg", dark: "empty-icons/empty-icon@dark.svg" } }}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
