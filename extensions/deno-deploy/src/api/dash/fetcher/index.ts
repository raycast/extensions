import { showFailureToast } from "@raycast/utils";

import { useErrorBoundary } from "@/context/ErrorBoundary";
import { getAccessToken, withValidToken } from "@/utils/accesstoken";
import { Fetcher } from "@/utils/fetch";

export const createFetcher = withValidToken(() => {
  const token = getAccessToken();
  const { throwError } = useErrorBoundary();
  return new Fetcher(token, "https://dash.deno.com/api", throwError);
});

export const createWindowLessFetcher = withValidToken(() => {
  const token = getAccessToken();
  const throwError = (error: Error) => {
    showFailureToast("An error occurred using Deno Dash API", error);
    throw error;
  };
  return new Fetcher(token, "https://dash.deno.com/api", throwError);
});
