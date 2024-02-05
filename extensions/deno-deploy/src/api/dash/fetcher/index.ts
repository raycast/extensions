import { getAccessToken, withValidToken } from "@/utils/accesstoken";
import { Fetcher } from "@/utils/fetch";

export const createFetcher = withValidToken(() => {
  const token = getAccessToken();
  return new Fetcher(token, "https://dash.deno.com/api");
});
