import { Action, Icon, Toast, showToast } from "@raycast/api";

import { initialSync } from "../api";
import { refreshMenuBarCommand } from "../helpers/menu-bar";
import useCachedData from "../hooks/useCachedData";

export default function RefreshAction() {
  const [, setCachedData] = useCachedData();

  async function refresh() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Syncing data" });
      const data = await initialSync();
      setCachedData(data);
      await showToast({ style: Toast.Style.Success, title: "Synced data" });
      await refreshMenuBarCommand();
    } catch {
      await showToast({ style: Toast.Style.Failure, title: "Unable to sync data" });
    }
  }

  return (
    <Action
      title="Refresh Data"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={refresh}
    />
  );
}
