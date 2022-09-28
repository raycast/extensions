import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import AddFileTemplate from "../add-file-template";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function NewFileHereEmptyView(props: {
  layout: string;
  title: string;
  description: string;
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { layout, title, description, setRefresh } = props;
  return layout === "List" ? (
    <List.EmptyView
      icon={{ source: { light: "empty-view-icon.svg", dark: "empty-view-icon@dark.svg" } }}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <Action.Push
            title={"Add File Template"}
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            target={<AddFileTemplate setRefresh={setRefresh} />}
          />
          <ActionOpenCommandPreferences />
        </ActionPanel>
      }
    />
  ) : (
    <Grid.EmptyView
      icon={{ source: { light: "empty-view-icon.svg", dark: "empty-view-icon@dark.svg" } }}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          <Action.Push
            title={"Add File Template"}
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            target={<AddFileTemplate setRefresh={setRefresh} />}
          />
          <ActionOpenCommandPreferences />
        </ActionPanel>
      }
    />
  );
}
