import { ActionPanel, Application, List, useNavigation } from "@raycast/api";
import React, { useState } from "react";
import { FolderPageListEmptyView } from "./folder-page-list-empty-view";
import { ActionsOnFiles } from "./action-on-files";
import { fakeMutate, getFolderByPath, isImage } from "../utils/common-utils";
import { parse } from "path";
import { ActionConfigureCommand } from "./action-configure-command";

export function FolderPageList(props: {
  frontmostApp: Application | undefined;
  folderName: string;
  folderPath: string;
  primaryAction: string;
}) {
  const { frontmostApp, folderName, folderPath, primaryAction } = props;
  const [currentItem, setCurrentItem] = useState<string>("");
  const folders = getFolderByPath(folderPath);
  const { pop } = useNavigation();
  return (
    <List
      navigationTitle={folderName}
      searchBarPlaceholder={folders.length > 0 ? "Search files" : folderPath}
      onSelectionChange={(id) => {
        if (typeof id === "string") setCurrentItem(id);
      }}
    >
      <FolderPageListEmptyView path={folderPath} pop={pop} />
      <List.Section title={folderPath}>
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
                  <ActionsOnFiles
                    frontmostApp={frontmostApp}
                    isTopFolder={false}
                    primaryAction={primaryAction}
                    name={value.name}
                    path={filePath}
                    mutate={fakeMutate}
                  />
                  <ActionConfigureCommand />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
