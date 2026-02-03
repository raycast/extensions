import { useCallback, useState } from "react";
import { Toast, showToast } from "@raycast/api";
import { LLMProviderError } from "shared/lib/llm-provider";

export type LLMRequestErrorState = {
  title: string;
  message: string;
  status?: number;
  snippet?: string;
};

type RunRequestOptions<T> = {
  execute: () => Promise<T>;
  onSuccess: (response: T) => void;
  inProgressTitle: string;
  successTitle: string;
  failureTitle: string;
  errorStateTitle?: string;
};

export function useLLMRequest() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorState, setErrorState] = useState<LLMRequestErrorState | null>(null);

  const runRequest = useCallback(async <T>(options: RunRequestOptions<T>) => {
    setIsLoading(true);
    setErrorState(null);

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: options.inProgressTitle,
    });

    try {
      const response = await options.execute();

      options.onSuccess(response);
      toast.style = Toast.Style.Success;
      toast.title = options.successTitle;
    } catch (error) {
      const info = toErrorInfo(error);
      if (options.errorStateTitle) {
        setErrorState({
          title: options.errorStateTitle,
          message: info.message,
          status: info.status,
        });
      }
      toast.style = Toast.Style.Failure;
      toast.title = options.failureTitle;
      toast.message = info.message;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, errorState, runRequest };
}

function toErrorInfo(error: unknown): { status?: number; message: string } {
  if (error instanceof LLMProviderError) {
    return { status: error.status, message: error.message };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: "API request failed" };
}
