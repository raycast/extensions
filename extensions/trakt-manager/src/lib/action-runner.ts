import { Toast, showToast } from "@raycast/api";
import { Dispatch, SetStateAction, useCallback } from "react";
import { captureTopDetail } from "./detail-stack";

type RunActionOptions = {
  setActionLoading: Dispatch<SetStateAction<boolean>>;
  onSuccess?: () => void;
};

export function useActionRunner<T>({ setActionLoading, onSuccess }: RunActionOptions) {
  return useCallback(
    async (item: T, action: (item: T) => Promise<void>, message: string): Promise<boolean> => {
      // A screen that revalidates after an action changed its list; the detail the action started in is
      // stale. Capture it now: after the await, the user may have left it or opened another one.
      const closeThisDetail = onSuccess ? captureTopDetail() : undefined;
      setActionLoading(true);
      try {
        await action(item);
        onSuccess?.();
        closeThisDetail?.();
        showToast({
          title: message,
          style: Toast.Style.Success,
        });
        return true;
      } catch (error) {
        showToast({
          title: (error as Error).message,
          style: Toast.Style.Failure,
        });
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [onSuccess, setActionLoading],
  );
}
