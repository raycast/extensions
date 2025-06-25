import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ErrorResult, PaginatedResult } from "./interfaces";

const { token } = getPreferenceValues<Preferences>();
const API_URL = "https://api.mailersend.com/v1/";
const API_HEADERS = {
  Authorization: `Bearer ${token}`,
};
const parseResponse = async (response: Response) => {
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
    mapResult(result: { data: T }) {
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
