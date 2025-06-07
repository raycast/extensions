import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ErrorResult, PaginatedResult, Result } from "./interfaces";

const { account_id, api_token } = getPreferenceValues<Preferences>();
export const API_URL = `https://api.keygen.sh/v1/accounts/${account_id}/`;
export const headers = {
  Accept: "application/vnd.api+json",
  Authorization: `Bearer ${api_token}`,
  "Content-Type": "application/vnd.api+json",
};
const PAGE_SIZE = 15;
export const MAX_PAGE_SIZE = 100;

export const parseResponse = async (response: Response) => {
  if (!response.ok) {
    const err: ErrorResult = await response.json();
    throw new Error(err.errors[0].detail);
  }
  const result = await response.json();
  return result;
};
export const useKeygen = <T>(endpoint: string) =>
  useFetch(API_URL + endpoint, {
    headers,
    parseResponse,
    mapResult(result: Result<T>) {
      return {
        data: result.data,
      };
    },
  });
export const useKeygenPaginated = <T>(endpoint: string, { pageSize }: { pageSize: number } = { pageSize: PAGE_SIZE }) =>
  useFetch(
    (options) =>
      API_URL +
      endpoint +
      "?" +
      new URLSearchParams({
        "page[number]": String(options.page + 1),
        "page[size]": String(pageSize),
      }).toString(),
    {
      headers,
      parseResponse,
      mapResult(result: PaginatedResult<T>) {
        return {
          data: result.data,
          hasMore: !!result.links.next,
        };
      },
      initialData: [],
    },
  );
