import { showToast, Toast } from "@raycast/api";
import { useRef } from "react";
export type Perform = (
  label: string,
  operation: () => Promise<unknown>,
  refresh?: () => Promise<void>,
) => Promise<void>;
export function useOperation(): Perform {
  const busy = useRef(false);
  return async (label, operation, refresh) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: label,
      });
      try {
        await operation();
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : String(error);
        return;
      }
      toast.style = Toast.Style.Success;
      try {
        await refresh?.();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Action Completed, Refresh Failed",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      busy.current = false;
    }
  };
}
