import { Toast, showToast } from "@raycast/api";
import { Dispatch, SetStateAction, useCallback } from "react";
import { closeTopDetail } from "./detail-stack";

type RunActionOptions = {
  setActionLoading: Dispatch<SetStateAction<boolean>>;
  onSuccess?: () => void;
};

export function useActionRunner<T>({ setActionLoading, onSuccess }: RunActionOptions) {
  return useCallback(
    async (item: T, action: (item: T) => Promise<void>, message: string) => {
      setActionLoading(true);
      try {
        await action(item);
        onSuccess?.();
        // A screen that revalidates after an action changed its list; a detail opened from it is stale.
        if (onSuccess) closeTopDetail();
        showToast({
          title: message,
          style: Toast.Style.Success,
        });
      } catch (error) {
        showToast({
          title: (error as Error).message,
          style: Toast.Style.Failure,
        });
      } finally {
        setActionLoading(false);
      }
    },
    [onSuccess, setActionLoading],
  );
}
