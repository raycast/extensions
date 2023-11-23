import React from "react";
import { Application, List } from "@raycast/api";
import { AutoQuitAppListItem } from "./auto-quit-app-list-item";
import { AutoQuitAppEmptyView } from "./auto-quit-app-empty-view";

export function AutoQuitAppListLayout(props: {
  quitApp: Application[];
  disQuitApp: Application[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
}) {
  const { quitApp, disQuitApp, setRefresh, loading } = props;
  return (
    <List isLoading={loading} searchBarPlaceholder={"Search apps"}>
      <AutoQuitAppEmptyView />

      <List.Section title="Quit Apps">
        {quitApp.map((app) => {
          return <AutoQuitAppListItem key={app.path} setRefresh={setRefresh} app={app} apps={quitApp} />;
        })}
      </List.Section>

      <List.Section title="Dis Quit Apps">
        {disQuitApp.map((app) => {
          return <AutoQuitAppListItem key={app.path} setRefresh={setRefresh} app={app} apps={quitApp} />;
        })}
      </List.Section>
    </List>
  );
}
