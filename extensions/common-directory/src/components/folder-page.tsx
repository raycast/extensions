import { Action, ActionPanel, getPreferenceValues, Icon, List, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { getFolderByPath } from "../hooks/hooks";
import { FolderPageListEmptyView } from "./list-empty-view";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { ActionCopyFile } from "./action-copy-file";
import { Preferences } from "../types/preferences";
import { ActionType, getItemAndSend } from "../utils/send-file-utils";

export function FolderPage(props: { folderName: string; folderPath: string; isOpenDirectory: boolean }) {
  const primaryAction = getPreferenceValues<Preferences>().primaryAction as ActionType;
  const { folderName, folderPath, isOpenDirectory } = props;
  const [currentItem, setCurrentItem] = useState<string>("");
  const { folders, loading } = getFolderByPath(folderPath, isOpenDirectory);
  const { pop } = useNavigation();
  return (
    <List
      navigationTitle={folderName}
      isLoading={loading}
      searchBarPlaceholder={folderPath}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined") setCurrentItem(id);
      }}
    >
      <FolderPageListEmptyView
        path={folderPath}
        isOpenDirectory={isOpenDirectory}
        primaryAction={primaryAction}
        pop={pop}
      />
      {folders.map((value, index) => {
        return (
          <List.Item
            id={value.name}
            key={index}
            icon={{ fileIcon: folderPath + "/" + value.name }}
            title={value.name}
            accessories={[currentItem === value.name ? { text: folderPath + "/" + value.name } : {}]}
            actions={
              <ActionPanel>
                {isOpenDirectory ? (
                  <>
                    <Action.Open title="Open" target={folderPath + "/" + value.name} />
                    <Action.ShowInFinder path={folderPath + "/" + value.name} />
                  </>
                ) : (
                  <>
                    <Action
                      title={primaryAction === ActionType.COPY ? "Copy to Directory" : "Move to Directory"}
                      icon={primaryAction === ActionType.COPY ? Icon.Clipboard : Icon.Download}
                      onAction={async () => {
                        if (primaryAction === ActionType.COPY) {
                          await getItemAndSend(ActionType.COPY, folderPath + "/" + value.name);
                        } else {
                          await getItemAndSend(ActionType.MOVE, folderPath + "/" + value.name);
                        }
                      }}
                    />
                    <Action
                      title={primaryAction === ActionType.COPY ? "Move to Directory" : "Copy to Directory"}
                      icon={primaryAction === ActionType.COPY ? Icon.Download : Icon.Clipboard}
                      onAction={async () => {
                        if (primaryAction === ActionType.COPY) {
                          await getItemAndSend(ActionType.MOVE, folderPath + "/" + value.name);
                        } else {
                          await getItemAndSend(ActionType.COPY, folderPath + "/" + value.name);
                        }
                      }}
                    />
                  </>
                )}

                <Action
                  icon={Icon.ChevronUp}
                  title={"Enclosing Folder"}
                  shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                  onAction={pop}
                />
                {value.isFolder && (
                  <Action.Push
                    icon={Icon.ChevronDown}
                    title={"Enter Folder"}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                    target={
                      <FolderPage
                        folderName={value.name}
                        folderPath={folderPath + "/" + value.name}
                        isOpenDirectory={isOpenDirectory}
                      />
                    }
                  />
                )}

                <ActionCopyFile name={value.name} path={folderPath + "/" + value.name} />
                <ActionOpenCommandPreferences />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
