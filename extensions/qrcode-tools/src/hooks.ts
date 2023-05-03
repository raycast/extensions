import { Toast, showToast } from "@raycast/api";
import { DependencyList, useCallback } from "react";

export function useCallbackWithToast(callback: (...args: unknown[]) => unknown, deps: DependencyList) {
  const cb = useCallback(() => {
    Promise.resolve(callback()).catch((e) => {
      showToast({
        style: Toast.Style.Failure,
        title: e.message,
      });
    });
  }, deps);

  return cb;
}
