import { ActionPanel, Application, Grid, useNavigation } from "@raycast/api";
import React from "react";
import { ActionsOnFiles } from "./action-on-files";
import { FolderPageGridEmptyView } from "./folder-page-grid-empty-view";
import { fakeMutate, getFolderByPath, isImage } from "../utils/common-utils";
import { parse } from "path";
import { ActionConfigureCommand } from "./action-configure-command";
import { columns, itemInset } from "../types/preferences";

export function FolderPageGrid(props: {
  frontmostApp: Application | undefined;
  folderName: string;
  folderPath: string;
  primaryAction: string;
}) {
  const { frontmostApp, folderName, folderPath, primaryAction } = props;
  const folders = getFolderByPath(folderPath);
  const { pop } = useNavigation();
  return (
    <Grid
      navigationTitle={folderName}
      columns={parseInt(columns)}
      inset={itemInset as Grid.Inset}
      aspectRatio={"4/3"}
      fit={Grid.Fit.Contain}
      searchBarPlaceholder={folders.length > 0 ? "Search files" : folderPath}
    >
      <FolderPageGridEmptyView path={folderPath} pop={pop} />
      <Grid.Section title={folderPath}>
        {folders.map((value, index) => {
          const filePath = folderPath + "/" + value.name;
          return (
            <Grid.Item
              id={value.name}
              key={index}
              content={isImage(parse(filePath).ext) ? { source: filePath } : { fileIcon: filePath }}
              title={value.name}
              quickLook={{ path: filePath, name: value.name }}
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
      </Grid.Section>
    </Grid>
  );
}
