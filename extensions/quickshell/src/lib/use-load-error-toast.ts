import { useEffect } from "react";
import { showFailureToast } from "@raycast/utils";

export function useLoadErrorToast(error: Error | undefined, title = "Failed to load"): void {
  useEffect(() => {
    if (!error) {
      return;
    }
    void showFailureToast(error, { title });
  }, [error, title]);
}
