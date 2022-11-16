import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import { pinFiles } from "../pin";
import { refreshNumber } from "../hooks/hooks";
import { ActionRemoveAllDirectories } from "./action-on-files";
import { DirectoryWithFileInfo } from "../types/types";

export function QuickAccessEmptyView(props: {
  layout: string;
  title: string;
  description: string;
  setRefresh: Dispatch<SetStateAction<number>>;
  directoryWithFiles: DirectoryWithFileInfo[];
}) {
  const { layout, title, description, setRefresh, directoryWithFiles } = props;
  return layout === "Grid" ? (
    <Grid.EmptyView
      icon={{ source: { light: "empty-view-icon.png", dark: "empty-view-icon@dark.png" } }}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <Action
            title={"Pin"}
            icon={Icon.Pin}
            onAction={async () => {
              await pinFiles([], false);
              setRefresh(refreshNumber());
            }}
          />
          {directoryWithFiles.length != 0 && <ActionRemoveAllDirectories setRefresh={setRefresh} />}
        </ActionPanel>
      }
    />
  ) : (
    <List.EmptyView
      icon={{ source: { light: "empty-view-icon.png", dark: "empty-view-icon@dark.png" } }}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <Action
            title={"Pin"}
            icon={Icon.Pin}
            onAction={async () => {
              await pinFiles([], false);
              setRefresh(refreshNumber());
            }}
          />
          {directoryWithFiles.length != 0 && <ActionRemoveAllDirectories setRefresh={setRefresh} />}
        </ActionPanel>
      }
    />
  );
}
