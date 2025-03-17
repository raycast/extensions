import { ActionPanel, getPreferenceValues, Grid, List } from "@raycast/api";
import React from "react";
import { Preferences } from "../types/preferences";
import { ActionOnEmptyView } from "./action-on-empty-view";

export function ShortcutsEmptyView(props: { setRefresh: React.Dispatch<React.SetStateAction<number>> }) {
  const { setRefresh } = props;
  const { layout } = getPreferenceValues<Preferences>();
  return layout === "Grid" ? (
    <Grid.EmptyView
      icon={{
        source: {
          light: "shortcuts-library-empty-view-icon.png",
          dark: "shortcuts-library-empty-view-icon@dark.png",
        },
      }}
      title={"No Shortcuts"}
      actions={
        <ActionPanel>
          <ActionOnEmptyView setRefresh={setRefresh} />
        </ActionPanel>
      }
    />
  ) : (
    <List.EmptyView
      icon={{
        source: {
          light: "shortcuts-library-empty-view-icon.png",
          dark: "shortcuts-library-empty-view-icon@dark.png",
        },
      }}
      title={"No Shortcuts"}
      actions={
        <ActionPanel>
          <ActionOnEmptyView setRefresh={setRefresh} />
        </ActionPanel>
      }
    />
  );
}
