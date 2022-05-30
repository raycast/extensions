import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import AddFileTemplate from "../add-file-template";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";

export function ListEmptyView(props: {
  title: string;
  description: string;
  setRefresh: Dispatch<SetStateAction<number>>;
}) {
  const { title, description, setRefresh } = props;
  return (
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
  );
}
