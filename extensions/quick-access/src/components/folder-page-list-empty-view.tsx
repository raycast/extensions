import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function FolderPageListEmptyView(props: { path: string; pop: () => void }) {
  const { path, pop } = props;
  return (
    <List.EmptyView
      icon={{ source: { light: "empty-view-icon.svg", dark: "empty-view-icon@dark.svg" } }}
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
