import { Action, Alert, confirmAlert, environment, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import { clearIconCache } from "./core/appicon";
import { createStore } from "./core/store";
import { iconCacheDir } from "./icons";

/** The one-action erase the README promises: every day file, the sampler state and the icon cache. */
export function ClearDataAction({ onCleared }: { onCleared: () => void }) {
  async function clearAll() {
    const confirmed = await confirmAlert({
      title: "Clear All Usage Data?",
      message: "Every recorded day is deleted. This cannot be undone.",
      icon: Icon.Trash,
      primaryAction: { title: "Clear All Data", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    try {
      await createStore(environment.supportPath).clear();
      await clearIconCache(iconCacheDir());
      await showToast({ style: Toast.Style.Success, title: "Usage data cleared" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not clear usage data", message: String(error) });
    }
    onCleared();
  }

  return (
    <Action
      title="Clear All Data"
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={Keyboard.Shortcut.Common.RemoveAll}
      onAction={clearAll}
    />
  );
}
