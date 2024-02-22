import React from "react";
import { Application, Grid } from "@raycast/api";
import { AutoQuitAppEmptyView } from "./auto-quit-app-empty-view";
import { AutoQuitAppGridItem } from "./auto-quit-app-grid-item";
import { columns, itemInset } from "../types/preferences";
import { isEmpty } from "../utils/common-utils";

export function AutoQuitAppGridLayout(props: {
  quitApp: Application[];
  disQuitApp: Application[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
  loading: boolean;
}) {
  const { quitApp, disQuitApp, setRefresh, loading } = props;
  return (
    <Grid
      columns={parseInt(columns)}
      inset={isEmpty(itemInset) ? undefined : (itemInset as Grid.Inset)}
      isLoading={loading}
      searchBarPlaceholder={"Search apps"}
    >
      <AutoQuitAppEmptyView />

      <Grid.Section title="Quit Apps">
        {quitApp.map((app) => {
          return <AutoQuitAppGridItem key={app.path} setRefresh={setRefresh} app={app} quitApps={quitApp} />;
        })}
      </Grid.Section>

      <Grid.Section title="Dis Quit Apps">
        {disQuitApp.map((app) => {
          return <AutoQuitAppGridItem key={app.path} setRefresh={setRefresh} app={app} quitApps={quitApp} />;
        })}
      </Grid.Section>
    </Grid>
  );
}
