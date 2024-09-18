import React from "react";
import { Application, List } from "@raycast/api";
import { ActionOnApp } from "./action-on-app";

export function AutoQuitAppListItem(props: {
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  app: Application;
  apps: Application[];
}) {
  const { setRefresh, app, apps } = props;

  return (
    <List.Item
      title={app.name}
      icon={{ fileIcon: app.path }}
      quickLook={{ path: app.path, name: app.name }}
      actions={<ActionOnApp app={app} apps={apps} setRefresh={setRefresh} />}
    />
  );
}
