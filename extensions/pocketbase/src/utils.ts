import { POCKETBASE_URL } from "./config";

export const generateUrl = (endpoint: string, params: Record<string, string>, overrideParams = false) => {
  const urlSearchParams = new URLSearchParams(params);
  if (!overrideParams) {
    urlSearchParams.append("filter", "");
    urlSearchParams.append("sort", "-created");
  }
  const url = new URL(`_/#/${endpoint}`, POCKETBASE_URL);
  return url + `?${urlSearchParams}`;
};
