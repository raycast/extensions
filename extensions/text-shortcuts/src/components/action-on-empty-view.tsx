import { Action, ActionPanel, Icon } from "@raycast/api";
import React from "react";
import CreateShortcut from "../create-shortcut";
import { ActionOpenPreferences } from "./action-open-preferences";

export function ActionOnEmptyView(props: { setRefresh: React.Dispatch<React.SetStateAction<number>> }) {
  const { setRefresh } = props;
  return (
    <>
      <ActionPanel.Section>
        <Action.Push
          title={"Create Shortcut"}
          icon={Icon.PlusCircle}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          target={<CreateShortcut shortcut={undefined} setRefresh={setRefresh} />}
        />
      </ActionPanel.Section>
      <ActionOpenPreferences />
    </>
  );
}
