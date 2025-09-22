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
  if (response.status === 204) return;
  const result = await response.json();
  if (!response.ok) {
    const err = result as ErrorResult;
    throw new Error(err.errors[0].detail);
  }
  return result;
};
export const useKeygen = <T>(endpoint: string) =>
  useFetch(API_URL + endpoint, {
    headers,
    parseResponse,
    mapResult(result) {
      const res = result as Result<T>;
      return {
        data: res.data,
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
      mapResult(result) {
        const res = result as PaginatedResult<T>;
        return {
          data: res.data,
          hasMore: !!res.links.next,
        };
      },
      initialData: [],
    },
  );
