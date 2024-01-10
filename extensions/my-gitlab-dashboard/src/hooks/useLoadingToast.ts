import { Toast, showToast } from "@raycast/api";
import { useEffect } from "react";

export function useLoadingToast(text: string, isLoading: boolean) {
  useEffect(() => {
    if (isLoading) {
      const toast = showToast({ title: text, style: Toast.Style.Animated });
      return () => {
        toast.then((t) => t.hide());
      };
    }
  }, [isLoading]);
}
