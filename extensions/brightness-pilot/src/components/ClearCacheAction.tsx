import { Action, Alert, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { clearCliDir } from "../utils/cli";

interface ClearCacheActionProps {
  revalidate?: () => Promise<void>;
}

export const ClearCacheAction = ({ revalidate }: ClearCacheActionProps) => {
  const onClearCache = async () => {
    const isConfirmed = await confirmAlert({
      title: "Clear the CLI Cache?",
      icon: Icon.Trash,
      message: "This action cannot be undone.",
      primaryAction: {
        title: "Clear Cache",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (isConfirmed) {
      try {
        await clearCliDir();
        await showToast({ style: Toast.Style.Success, title: "Cache cleared successfully" });
      } catch (error) {
        await showFailureToast(error, {
          title: "Failed to clear cache",
        });
      }

      try {
        await revalidate?.();
        // eslint-disable-next-line no-empty
      } catch {}
    }
  };

  return <Action title="Clear CLI Cache" icon={Icon.Trash} style={Action.Style.Destructive} onAction={onClearCache} />;
};