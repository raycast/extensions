import { ActionPanel, Grid, List } from "@raycast/api";
import { ActionOpenPreferences } from "@/components/action-open-preferences";

export function PlaceholderEmptyView(props: { layout: string }) {
  const { layout } = props;
  return layout === "List" ? (
    <List.EmptyView
      icon={{ source: { light: "picsum-icon.png", dark: "picsum-icon@dark.png" } }}
      title={"No images"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      icon={{ source: { light: "picsum-icon.png", dark: "picsum-icon@dark.png" } }}
      title={"No images"}
      actions={
        <ActionPanel>
          <ActionOpenPreferences />
        </ActionPanel>
      }
    />
  );
}
