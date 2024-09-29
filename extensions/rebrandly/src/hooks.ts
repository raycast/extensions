import { useFetch } from "@raycast/utils";
import { API_KEY, API_URL, MAX_PAGE_SIZE } from "./config";
import { BrandedLink } from "./types";

const API_PARAMS = {
  apikey: API_KEY,
  Accept: "application/json",
  "Content-Type": "application/json",
};
export const useGetLinks = () =>
  useFetch(
    (options) =>
      API_URL +
      "links?" +
      new URLSearchParams({
        ...API_PARAMS,
        orderBy: "slashtag",
        orderDir: "asc",
        limit: String(MAX_PAGE_SIZE),
        last: options.cursor || "",
      }).toString(),
    {
      mapResult(result: BrandedLink[]) {
        return {
          data: result,
          cursor: result.at(-1)?.id,
          hasMore: result.length === MAX_PAGE_SIZE,
        };
      },
      initialData: [],
    }
  );
