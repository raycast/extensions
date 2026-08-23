import { Toast, showToast } from "@raycast/api";
import { Dispatch, SetStateAction, useCallback } from "react";

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
