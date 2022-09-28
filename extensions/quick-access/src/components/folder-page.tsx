import { ActionPanel, List, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { getFolderByPath } from "../hooks/hooks";
import { FolderPageListEmptyView } from "./folder-page-list-empty-view";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { ActionsOnFile } from "./action-on-files";

export function FolderPage(props: { folderName: string; folderPath: string; primaryAction: string }) {
  const { folderName, folderPath, primaryAction } = props;
  const [currentItem, setCurrentItem] = useState<string>("");
  const { folders, loading } = getFolderByPath(folderPath);
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
      <FolderPageListEmptyView path={folderPath} pop={pop} />
      {folders.map((value, index) => {
        return (
          <List.Item
            id={value.name}
            key={index}
            icon={{ fileIcon: folderPath + "/" + value.name }}
            title={value.name}
            quickLook={{ path: folderPath + "/" + value.name, name: value.name }}
            accessories={[currentItem === value.name ? { text: folderPath + "/" + value.name } : {}]}
            actions={
              <ActionPanel>
                <ActionsOnFile
                  isTopFolder={false}
                  primaryAction={primaryAction}
                  name={value.name}
                  path={folderPath + "/" + value.name}
                  index={index}
                  setRefresh={() => {
                    return;
                  }}
                />
                <ActionOpenCommandPreferences />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
