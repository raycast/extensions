import { ActionPanel, Grid, List } from "@raycast/api";
import { ActionToPexels } from "./action-to-pexels";
import { ActionOpenPreferences } from "./action-open-preferences";
import { layout } from "../types/preferences";

export function PexelsEmptyView(props: { title: string }) {
  const { title } = props;
  return layout === "List" ? (
    <List.EmptyView
      title={title}
      icon={"empty-view-icon.png"}
      actions={
        <ActionPanel>
          <ActionToPexels />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      title={title}
      icon={"empty-view-icon.png"}
      actions={
        <ActionPanel>
          <ActionToPexels />
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
