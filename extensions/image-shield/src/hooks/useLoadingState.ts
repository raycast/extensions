import { useState } from "react";
import { showToast, Toast } from "@raycast/api";

interface UseLoadingStateResult {
  isLoading: boolean;
  error?: string;
  setError: (err: string | undefined) => void;
  handleError: (e: unknown) => void;
  showErrorToast: (title: string, message?: string) => void;
  setIsLoading: (loading: boolean) => void;
}

export function useLoadingState(): UseLoadingStateResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleError = (e: unknown) => {
    setError(String(e));
    setIsLoading(false);
  };

  const showErrorToast = (title: string, message?: string) => {
    showToast({
      style: Toast.Style.Failure,
      title,
      message,
    });
  };

  return {
    isLoading,
    error,
    setError,
    handleError,
    showErrorToast,
    setIsLoading,
  };
}
