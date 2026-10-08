import { useCallback, useEffect, useRef } from "react";
import { Toast, showToast } from "@raycast/api";

type Options = {
  isLoading: boolean;
  title: string;
};

export function useLoadingToast({ isLoading, title }: Options): void {
  const toastRef = useRef<Toast | undefined>(undefined);

  const hideToast = useCallback(async () => {
    if (!toastRef.current) return;
    const toast = toastRef.current;
    toastRef.current = undefined;
    await toast.hide();
  }, []);

  useEffect(() => {
    let disposed = false;

    const syncLoadingToast = async () => {
      if (isLoading) {
        if (!toastRef.current) {
          const toast = await showToast({ style: Toast.Style.Animated, title });
          if (disposed || !isLoading) {
            await toast.hide();
            return;
          }
          toastRef.current = toast;
        }
        return;
      }

      await hideToast();
    };

    void syncLoadingToast();

    return () => {
      disposed = true;
      void hideToast();
    };
  }, [isLoading, title, hideToast]);
}
