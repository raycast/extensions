import { showFailureToast } from "@raycast/utils";

import { useErrorBoundary } from "@/context/ErrorBoundary";
import { getAccessToken, withValidToken } from "@/utils/accesstoken";
import { Fetcher } from "@/utils/fetch";

export const createUrlFetcher = withValidToken((url: string) => {
  const token = getAccessToken();
  const { throwError } = useErrorBoundary();
  return new Fetcher(token, url, throwError);
});

export const createUrlWindowLessFetcher = withValidToken((url: string) => {
  const token = getAccessToken();
  const throwError = (error: Error) => {
    showFailureToast("An error occurred using Deno API", error);
    throw error;
  };
  return new Fetcher(token, url, throwError);
});
