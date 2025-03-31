import React, { useMemo } from "react";
import { Grid } from "@raycast/api";
import { AutoQuitAppEmptyView } from "./auto-quit-app-empty-view";
import { AutoQuitAppGridItem } from "./auto-quit-app-grid-item";
import { columns, itemInset } from "../types/preferences";
import { isEmpty } from "../utils/common-utils";
import { useAutoQuitApps } from "../hooks/useAutoQuitApps";
import { useDisAutoQuitApps } from "../hooks/useDisAutoQuitApps";

export function AutoQuitAppGridLayout() {
  const { data: autoQuitAppsData, isLoading: autoQuitAppsIsLoading, mutate: autoQuitAppsMutate } = useAutoQuitApps();
  const {
    data: autoDisQuitAppsData,
    isLoading: autoDisQuitAppsIsLoading,
    mutate: autoDisQuitAppsMutate,
  } = useDisAutoQuitApps();

  const loading = autoQuitAppsIsLoading || autoDisQuitAppsIsLoading;
  const quitApp = useMemo(() => {
    return autoQuitAppsData || [];
  }, [autoQuitAppsData]);
  const disQuitApp = useMemo(() => {
    return autoDisQuitAppsData || [];
  }, [autoDisQuitAppsData]);

  const setRefresh = async () => {
    await autoQuitAppsMutate();
    await autoDisQuitAppsMutate();
  };

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
