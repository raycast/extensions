import { useFetch } from "@raycast/utils";
import { API_HEADERS, API_URL, MAX_PAGE_SIZE } from "./config";
import { BrandedLink, ErrorResponse } from "./interfaces";

export const parseResponse = async (response: Response) => {
  if (!response.ok) {
    if (response.headers.get("Content-Type")?.includes("text/html")) {
      const err = await response.text();
      throw new Error(err);
    }
    const res: ErrorResponse = await response.json();
    if (res.errors?.length) {
      const err = res.errors[0];
      throw new Error(`${err.property} - ${err.message}`);
    }
    throw new Error(res.message);
  }
  const result = await response.json();
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
    },
  );
