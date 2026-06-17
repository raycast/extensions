import { usePromise } from "@raycast/utils";
import { cn } from "../utils/collected-notes";

export const useValidation = () => {
  const { isLoading, error, data } = usePromise(() => cn.me(), []);

  // @ts-expect-error For some reason error is in data
  const hasError = error || data?.error;

  return {
    isLoading,
    hasError,
    error,
    data,
  };
};
