import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ErrorResult, PaginatedResult, Result } from "./interfaces";

const { token } = getPreferenceValues<Preferences>();
export const API_URL = "https://api.mailersend.com/v1/";
export const API_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
};
export const parseResponse = async (response: Response) => {
  const result = await response.json();
  if (!response.ok) {
    const errorResult = result as ErrorResult;
    throw new Error(errorResult.message);
  }
  return result;
};

export const useMailerSend = <T>(endpoint: string) =>
  useFetch(API_URL + endpoint, {
    headers: API_HEADERS,
    parseResponse,
    mapResult(result: Result<T>) {
      return {
        data: result.data,
      };
    },
  });
export const useMailerSendPaginated = <T>(endpoint: string) =>
  useFetch((options) => options.cursor ?? API_URL + endpoint, {
    headers: API_HEADERS,
    parseResponse,
    mapResult(result: PaginatedResult<T>) {
      return {
        data: result.data,
        hasMore: !!result.links.next,
        cursor: result.links.next,
      };
    },
    initialData: [],
  });
