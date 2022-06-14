import { Action, ActionPanel, Icon, List, open, showHUD } from "@raycast/api";
import React from "react";
import { ActionOpenPreferences } from "./action-open-preferences";

export function EmptyView(props: { title: string; isOpenFolder: boolean }) {
  const { title, isOpenFolder } = props;
  return (
    <List.EmptyView
      title={title}
      icon={{ source: "empty-icon.svg" }}
      actions={
        <ActionPanel>
          {isOpenFolder && (
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
          {!isOpenFolder && (
            <Action
              icon={Icon.Gear}
              title={"Open Bunch Preferences"}
              shortcut={{ modifiers: ["shift", "cmd"], key: "," }}
              onAction={() => {
                open("x-bunch://prefs").then();
              }}
            />
          )}
          {isOpenFolder && <ActionOpenPreferences />}
        </ActionPanel>
      }
    />
  );
}
