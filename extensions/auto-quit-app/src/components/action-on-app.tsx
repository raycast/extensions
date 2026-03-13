import React from "react";
import { Action, ActionPanel, Application, Icon } from "@raycast/api";
import { CacheKey, defaultCache } from "../utils/constants";
import { ActionOpenPreferences } from "./action-open-preferences";

export function ActionOnApp(props: {
  app: Application;
  apps: Application[];
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { app, apps, setRefresh } = props;
  const isExist = apps.some((a) => a.path === app.path);

  return (
    <ActionPanel>
      <Action
        title={isExist ? "Disable Auto Quit" : "Enable Auto Quit"}
        icon={isExist ? Icon.XMarkCircle : Icon.Circle}
        onAction={async () => {
          const newApps = [...apps];
          if (isExist) {
            const _newApps = newApps.filter((a) => a.path !== app.path);
            defaultCache.set(CacheKey.QUIT_APP, JSON.stringify(_newApps));
          } else {
            newApps.push(app);
            defaultCache.set(CacheKey.QUIT_APP, JSON.stringify(newApps));
          }
          setRefresh(Date.now());
        }}
      />
      <ActionOpenPreferences />
    </ActionPanel>
  );
}
