import { ActionPanel, Grid, List } from "@raycast/api";
import { ActionOpenPreferences } from "./action-open-preferences";
import { itemLayout } from "../types/preferences";

export function EmptyView() {
  return itemLayout === "List" ? (
    <List.EmptyView
      title={"No Fonts"}
      icon={{ source: { light: "empty-icons/empty-icon.png", dark: "empty-icons/empty-icon@dark.png" } }}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      title={"No Fonts"}
      icon={{ source: { light: "empty-icons/empty-icon.png", dark: "empty-icons/empty-icon@dark.png" } }}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
