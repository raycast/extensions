import React from "react";
import { Action, Icon, LocalStorage } from "@raycast/api";
import { OpenLinkApplication } from "../types/types";
import { CacheKey } from "../utils/constants";

export function ActionAddOpenLinkApp(props: {
  curApp: OpenLinkApplication;
  setRefresh: React.Dispatch<React.SetStateAction<number>>;
}) {
  const { curApp, setRefresh } = props;

  return (
    <Action
      title="Add to Preferred"
      icon={Icon.Star}
      shortcut={{ modifiers: ["shift", "cmd"], key: "p" }}
      onAction={async () => {
        const localBrowsers = await LocalStorage.getItem<string>(CacheKey.PREFERRED_APP);
        const _customApps: OpenLinkApplication[] = typeof localBrowsers == "string" ? JSON.parse(localBrowsers) : [];

        _customApps.push({
          bundleId: curApp.bundleId,
          name: curApp.name,
          path: curApp.path,
          rankText: 1,
          rankURL: 1,
          rankEmail: 1,
        });
        await LocalStorage.setItem(CacheKey.PREFERRED_APP, JSON.stringify(_customApps));
        setRefresh(Date.now());
      }}
    />
  );
}
