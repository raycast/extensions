import { Action, ActionPanel, Icon, List, open, showHUD } from "@raycast/api";
import { ActionOpenPreferences } from "./action-open-preferences";

export function EmptyView(props: { title: string; extensionPreferences: boolean }) {
  const { title, extensionPreferences } = props;
  return (
    <List.EmptyView
      title={title}
      icon={{ source: "empty-icon.svg" }}
      actions={
        <ActionPanel>
          {extensionPreferences && (
            <Action
              icon={Icon.Finder}
              title={"Open Bunch Folder"}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
              onAction={async () => {
                await open(encodeURI("x-bunch://reveal"));
                await showHUD("Open Bunch Folder");
              }}
            />
          )}
          {!extensionPreferences && (
            <Action
              icon={Icon.Gear}
              title={"Open Bunch Preferences"}
              shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
              onAction={() => {
                open("x-bunch://prefs").then();
              }}
            />
          )}
          {extensionPreferences && <ActionOpenPreferences />}
        </ActionPanel>
      }
    />
  );
}
