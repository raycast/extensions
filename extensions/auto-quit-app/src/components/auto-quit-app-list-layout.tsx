import React, { useMemo } from "react";
import { List } from "@raycast/api";
import { AutoQuitAppListItem } from "./auto-quit-app-list-item";
import { AutoQuitAppEmptyView } from "./auto-quit-app-empty-view";
import { useAutoQuitApps } from "../hooks/useAutoQuitApps";
import { useDisAutoQuitApps } from "../hooks/useDisAutoQuitApps";

export function AutoQuitAppListLayout() {
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
