import { ActionPanel, List, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { getFolderByPath } from "../hooks/hooks";
import { FolderPageListEmptyView } from "./folder-page-list-empty-view";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { ActionsOnFile } from "./action-on-files";
import { isImage } from "../utils/common-utils";
import { parse } from "path";

export function FolderPageList(props: { folderName: string; folderPath: string; primaryAction: string }) {
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
        if (typeof id === "string") setCurrentItem(id);
      }}
    >
      <FolderPageListEmptyView path={folderPath} pop={pop} />
      {folders.map((value, index) => {
        const filePath = folderPath + "/" + value.name;
        return (
          <List.Item
            id={value.name}
            key={index}
            icon={isImage(parse(filePath).ext) ? { source: filePath } : { fileIcon: filePath }}
            title={value.name}
            quickLook={{ path: filePath, name: value.name }}
            accessories={[currentItem === value.name ? { text: filePath } : {}]}
            actions={
              <ActionPanel>
                <ActionsOnFile
                  isTopFolder={false}
                  primaryAction={primaryAction}
                  name={value.name}
                  path={filePath}
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
