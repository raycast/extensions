import { Action, Icon, Toast, showToast } from "@raycast/api";

import { SyncData, initialSync } from "../api";
import { refreshMenuBarCommand } from "../helpers/menu-bar";

type RefreshActionProps = {
  setData: React.Dispatch<React.SetStateAction<SyncData | undefined>>;
};

export default function RefreshAction({ setData }: RefreshActionProps) {
  async function refresh() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Syncing data" });
      const data = await initialSync();
      setData(data);
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
