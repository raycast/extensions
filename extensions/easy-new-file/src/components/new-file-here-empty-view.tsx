import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import React from "react";
import AddFileTemplate from "../add-file-template";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import { MutatePromise } from "@raycast/utils";
import { TemplateType } from "../types/file-type";

export function NewFileHereEmptyView(props: {
  layout: string;
  title: string;
  description: string;
  mutate: MutatePromise<TemplateType[]>;
}) {
  const { layout, title, description, mutate } = props;
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
            target={<AddFileTemplate mutate={mutate} />}
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
            target={<AddFileTemplate mutate={mutate} />}
          />
          <ActionOpenCommandPreferences />
        </ActionPanel>
      }
    />
  );
}
