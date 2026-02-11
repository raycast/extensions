import { useCachedPromise } from "@raycast/utils";
import { getRequirements } from "./requirements";

type LoadingState = {
  loading: true;
  check?: never;
  error?: never;
};

export type ErrorState = {
  loading: false;
  check: false;
  error: string;
};

export type SuccessState = {
  loading: false;
  check: true;
  error?: never;
};

type RequirementValidation = LoadingState | ErrorState | SuccessState;
export function useValidateRequirements(): RequirementValidation {
  const { isLoading, data } = useCachedPromise(getRequirements);

  if (!data) {
    return { loading: isLoading } as LoadingState;
  }
  if (data) {
    const [isInstalled, isPro] = data;
    if (!isInstalled) {
      return {
        check: false,
        loading: false,
        error: "Omnifocus must be installed",
      };
    } else if (!isPro) {
      return {
        check: false,
        loading: false,
        error: "An active Omnifocus Pro subsription is required",
      };
    }
  }

  return {
    loading: false,
    check: true,
  };
}
