import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL, MAX_PAGE_SIZE } from "./config";
import { BrandedLink } from "./types";

export const useGetLinks = () =>
  useFetch(
    (options) =>
      API_URL +
      "links?" +
      new URLSearchParams({
        orderBy: "slashtag",
        orderDir: "asc",
        limit: String(MAX_PAGE_SIZE),
        last: options.cursor || "",
      }).toString(),
    {
      headers: API_HEADERS,
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
