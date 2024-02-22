import { useErrorBoundary } from "@/context/ErrorBoundary";
import { getAccessToken, withValidToken } from "@/utils/accesstoken";
import { Fetcher } from "@/utils/fetch";

export const createFetcher = withValidToken(() => {
  const token = getAccessToken();
  const { throwError } = useErrorBoundary();
  return new Fetcher(token, "https://api.deno.com/v1", throwError);
});
