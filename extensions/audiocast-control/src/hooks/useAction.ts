import { useCallback, useState } from "react";
import { showHUD, showToast, Toast, PopToRootType } from "@raycast/api";
import { createLog } from "../lib/debug";

const log = createLog("useAction");

export interface UseActionOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  closeMainWindowOnSuccess?: boolean;
}

export function useAction<A extends Array<unknown>, R = void>(
  action: (...args: A) => Promise<R>,
  options?: UseActionOptions,
) {
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  const memoizedAction = useCallback(
    async (...args: A) => {
      setIsPerformingAction(true);

      try {
        await action(...args);

        options?.onSuccess?.();

        if (options?.closeMainWindowOnSuccess) {
          showHUD(options?.successMessage || "Action completed successfully", {
            clearRootSearch: false,
            popToRootType: PopToRootType.Immediate,
          });
        } else {
          showToast({
            title: options?.successMessage || "Action completed successfully",
            style: Toast.Style.Success,
          });
        }
      } catch (error) {
        log.error(`Action failed: ${error}`);

        options?.onError?.(error as Error);

        showToast({
          title: options?.errorMessage || "Action failed",
          style: Toast.Style.Failure,
        });
      } finally {
        setIsPerformingAction(false);
      }
    },
    [action, options],
  );

  return {
    action: memoizedAction,
    isPerformingAction,
  };
}
