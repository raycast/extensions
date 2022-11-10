import { ActionPanel, getPreferenceValues, Grid, useNavigation } from "@raycast/api";
import React from "react";
import { getFolderByPath } from "../hooks/hooks";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { ActionsOnFile } from "./action-on-files";
import { FolderPageGridEmptyView } from "./folder-page-grid-empty-view";
import { Preferences } from "../types/preferences";
import { isImage } from "../utils/common-utils";
import { parse } from "path";

export function FolderPageGrid(props: { folderName: string; folderPath: string; primaryAction: string }) {
  const { folderName, folderPath, primaryAction } = props;
  const { columns, itemInset } = getPreferenceValues<Preferences>();
  const { folders, loading } = getFolderByPath(folderPath);
  const { pop } = useNavigation();
  return (
    <Grid
      navigationTitle={folderName}
      isLoading={loading}
      columns={parseInt(columns)}
      inset={itemInset as Grid.Inset}
      searchBarPlaceholder={folderPath}
    >
      <FolderPageGridEmptyView path={folderPath} pop={pop} />
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
    </Grid>
  );
}
