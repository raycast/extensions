import { Action, ActionPanel, Icon, List } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import { ActionOpenCommandPreferences } from "./action-open-command-preferences";
import AddCommonDirectory from "../add-common-directory";
import { ActionType, getItemAndSend } from "../utils/send-file-utils";
import { ActionCopyFile } from "./action-copy-file";

export function ListEmptyView(props: { setRefresh: Dispatch<SetStateAction<number>> }) {
  const { setRefresh } = props;
  return (
    <List.EmptyView
      icon={{ source: { light: "empty-view-icon.svg", dark: "empty-view-icon@dark.svg" } }}
      title={"No directories"}
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

export function FolderPageListEmptyView(props: {
  path: string;
  isOpenDirectory: boolean;
  primaryAction: string;
  pop: () => void;
}) {
  const { path, isOpenDirectory, primaryAction, pop } = props;
  return (
    <List.EmptyView
      icon={{ source: { light: "empty-view-icon.svg", dark: "empty-view-icon@dark.svg" } }}
      title={"No folder"}
      actions={
        <ActionPanel>
          {isOpenDirectory ? (
            <>
              <Action.Open title="Open" target={path} />
              <Action.ShowInFinder path={path} />
            </>
          ) : (
            <>
              <Action
                title={primaryAction === ActionType.COPY ? "Copy to Directory" : "Move to Directory"}
                icon={primaryAction === ActionType.COPY ? Icon.Clipboard : Icon.Download}
                onAction={async () => {
                  if (primaryAction === ActionType.COPY) {
                    await getItemAndSend(ActionType.COPY, path);
                  } else {
                    await getItemAndSend(ActionType.MOVE, path);
                  }
                }}
              />
              <Action
                title={primaryAction === ActionType.COPY ? "Move to Directory" : "Copy to Directory"}
                icon={primaryAction === ActionType.COPY ? Icon.Download : Icon.Clipboard}
                onAction={async () => {
                  if (primaryAction === ActionType.COPY) {
                    await getItemAndSend(ActionType.MOVE, path);
                  } else {
                    await getItemAndSend(ActionType.COPY, path);
                  }
                }}
              />
            </>
          )}

          <Action
            icon={Icon.ChevronUp}
            title={"Enclosing Folder"}
            shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
            onAction={pop}
          />
          <ActionOpenCommandPreferences />
        </ActionPanel>
      }
    />
  );
}
