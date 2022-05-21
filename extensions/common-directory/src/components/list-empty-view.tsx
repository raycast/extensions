import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import AddCommonDirectory from "../add-common-directory";

export function ListEmptyView(props: { setRefresh: Dispatch<SetStateAction<number>> }) {
  const { setRefresh } = props;
  return (
    <List.EmptyView
      icon={{ source: { light: "empty-view-icon.svg", dark: "empty-view-icon@dark.svg" } }}
      title={"No directories"}
      description={""}
      actions={
        <ActionPanel>
          <Action.Push
            title={"Add Directory"}
            icon={Icon.Plus}
            target={<AddCommonDirectory setRefresh={setRefresh} />}
          />
          <ActionOpenCommandPreferences />
        </ActionPanel>
      }
    />
  );
}
