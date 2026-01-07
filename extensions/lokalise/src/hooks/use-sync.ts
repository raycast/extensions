import { useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { client } from "../api/client";

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async (onSuccess?: () => void) => {
    setIsSyncing(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Syncing translations...",
    });

    try {
      const result = await client.syncFromLokalise((current, total) => {
        toast.message = `${current} of ~${total} keys`;
      });

      if (result.success) {
        await toast.hide();
        await showToast({
          style: Toast.Style.Success,
          title: "Sync Complete",
          message: `${result.keysCount} keys synced`,
        });
        onSuccess?.();
      } else {
        await toast.hide();
        await showToast({
          style: Toast.Style.Failure,
          title: "Sync Failed",
          message: result.error?.message || "Unknown error",
        });
      }
    } catch (error) {
      await toast.hide();
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
