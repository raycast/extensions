import { useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { client } from "../api/client";

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async (onSuccess?: () => void) => {
    setIsSyncing(true);
    const progressToast = await showToast({
      style: Toast.Style.Animated,
      title: "Syncing translations...",
    });

    try {
      const result = await client.syncFromLokalise((current) => {
        progressToast.message = `~${current} keys synced`;
      });

      if (result.success) {
        await progressToast.hide();
        await showToast({
          style: Toast.Style.Success,
          title: "Sync Complete",
          message: `${result.keysCount} keys synced`,
        });
        onSuccess?.();
      } else {
        await progressToast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: "Sync Failed",
          message: result.error?.message || "Unknown error",
        });
      }
    } catch (error) {
      await progressToast.hide();
      await showToast({
        style: Toast.Style.Failure,
        title: "Sync Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return { isSyncing, handleSync };
}
