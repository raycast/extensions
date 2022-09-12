import React from "react";
import { Action, Icon, LocalStorage } from "@raycast/api";
import { LocalStorageKey, OpenLinkApplication } from "../types/types";

export function ActionAddOpenLinkApp(props: {
  curApp: OpenLinkApplication;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { curApp, setRefresh } = props;

  return (
    <Action
      title="Add Application"
      icon={Icon.Plus}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={async () => {
        const localBrowsers = await LocalStorage.getItem<string>(LocalStorageKey.CUSTOM_APPS);
        const _customApps: OpenLinkApplication[] = typeof localBrowsers == "string" ? JSON.parse(localBrowsers) : [];

        _customApps.push({
          bundleId: curApp.bundleId,
          name: curApp.name,
          path: curApp.path,
          rankText: 1,
          rankURL: 1,
          rankEmail: 1,
        });
        await LocalStorage.setItem(LocalStorageKey.CUSTOM_APPS, JSON.stringify(_customApps));
        setRefresh(Date.now());
      }}
    />
  );
}
