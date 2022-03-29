import { useEffect } from "react";
import { showToast, Toast } from "@raycast/api";

export const useHandleError = (error?: HTTPError) => {
  useEffect(() => {
    if (error) {
      if (error.status === 401 || error.status === 403) {
        showToast(
          Toast.Style.Failure,
          "Invalid API token",
          "Please, validate your Readwise API token is correct and you added one."
        );
      } else {
        showToast(Toast.Style.Failure, "Something went wrong.", "Please, try it again.");
      }
    }
  }, [error]);
};
