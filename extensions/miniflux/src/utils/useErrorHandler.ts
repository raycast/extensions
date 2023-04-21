import { popToRoot, showToast, Toast } from "@raycast/api";
import { MinifluxApiError } from "./types";
import { useCallback } from "react";

export const useErrorHandler = () => {
  const handleError = useCallback((error: MinifluxApiError) => {
    let errorMessage = error.error_message || "Failed to load feeds";

    if (error?.code === "401") {
      errorMessage = "Invalid Credentials. Check your API key and try again. (ToT)";
      popToRoot({ clearSearchBar: true });
    }

    showToast(Toast.Style.Failure, errorMessage);
  }, []);

  return handleError;
};
