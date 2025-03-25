import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL, MAX_PAGE_SIZE } from "./config";
import { BrandedLink, ErrorResponse } from "./interfaces";
import { Response as FetchResponse } from "node-fetch";

export const parseResponse = async (response: Response | FetchResponse) => {
  const result = await response.json();
  if (!response.ok) {
    const res = result as ErrorResponse;
    if (res.errors?.length) {
      const err = res.errors[0];
      throw new Error(`${err.property} - ${err.message}`);
    }
    throw new Error(res.message);
  }
  return result;
};

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
      parseResponse,
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
