import { popToRoot, showToast, Toast } from "@raycast/api";
import { MinifluxApiError } from "./types";
import { useCallback } from "react";

export const useErrorHandler = () => {
  const handleError = useCallback((error: unknown) => {
    let errorMessage = "An unknown error occurred";

    if (error instanceof MinifluxApiError) {
      errorMessage = error.message;

      if (error.code === "401") {
        errorMessage = "Invalid credentials, check your API key and try again";
        popToRoot({ clearSearchBar: true });
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    showToast(Toast.Style.Failure, errorMessage);
  }, []);

  return handleError;
};
