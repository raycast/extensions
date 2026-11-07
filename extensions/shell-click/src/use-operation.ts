import { showToast, Toast } from "@raycast/api";
import { useRef } from "react";
export type Perform = (
  label: string,
  operation: () => Promise<unknown>,
) => Promise<boolean>;
export function useOperation(): Perform {
  const busy = useRef(false);
  return async (label, operation) => {
    if (busy.current) return false;
    busy.current = true;
    try {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: label,
      });
      try {
        await operation();
        toast.style = Toast.Style.Success;
        return true;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.message = error instanceof Error ? error.message : String(error);
        return false;
      }
    } finally {
      busy.current = false;
    }
  };
}
