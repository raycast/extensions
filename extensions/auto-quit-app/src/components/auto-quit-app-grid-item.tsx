import React from "react";
import { Application, Grid } from "@raycast/api";
import { ActionOnApp } from "./action-on-app";

export function AutoQuitAppGridItem(props: {
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  app: Application;
  quitApps: Application[];
}) {
  const { setRefresh, app, quitApps } = props;

  return (
    <Grid.Item
      title={app.name}
      content={{ fileIcon: app.path }}
      quickLook={{ path: app.path, name: app.name }}
      actions={<ActionOnApp app={app} apps={quitApps} setRefresh={setRefresh} />}
    />
  );
}
