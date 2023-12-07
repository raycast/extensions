import React from "react";
import { Action, ActionPanel } from "@raycast/api";
import HistoryCommand from "../../history";

const ShowInHistory = () => (
  <Action.Push
    title="Show History"
    shortcut={{ modifiers: ["cmd"], key: "y" }}
    target={<HistoryCommand />}
  />
);

export default ShowInHistory;

export const GlobalActions = () => (
  <ActionPanel.Section>
    <ShowInHistory />
  </ActionPanel.Section>
);
