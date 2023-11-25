import { Action, ActionPanel, Icon, Grid } from "@raycast/api";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function FolderPageGridEmptyView(props: { path: string; pop: () => void }) {
  const { path, pop } = props;
  return (
    <Grid.EmptyView
      icon={{ source: { light: "empty-view-icon.png", dark: "empty-view-icon@dark.png" } }}
      title={"No folder"}
      actions={
        <ActionPanel>
          <Action.Open title="Open" target={path} />
          <Action.ShowInFinder path={path} />

          <Action
            icon={Icon.ChevronUp}
            title={"Enclosing Folder"}
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
            onAction={pop}
          />
          <ActionOpenCommandPreferences />
        </ActionPanel>
      }
    />
  );
}
