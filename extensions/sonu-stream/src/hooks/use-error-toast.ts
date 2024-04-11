import { useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export function useErrorToast(error?: Error) {
  useEffect(() => {
    if (error) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Oops! 🎵 We're Out of Tune! 🎵",
      });
    }
  }, [error]);
}
