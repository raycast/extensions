import { Action, ActionPanel, Color, Icon } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";

export function RefreshWifi(props: { setRefresh: Dispatch<SetStateAction<number>> }) {
  const { setRefresh } = props;
  return (
    <ActionPanel.Section>
      <Action
        icon={{ source: Icon.ArrowClockwise, tintColor: Color.PrimaryText }}
        title={"Refresh Wi-Fi"}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={() => {
          setRefresh(Date.now);
        }}
      />
    </ActionPanel.Section>
  );
}
