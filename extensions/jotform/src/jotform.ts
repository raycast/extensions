import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ErrorResponse, SuccessResponse } from "./types";

const { api_key } = getPreferenceValues<Preferences>();

export const useJotform = <T>(endpoint: string) =>
  useFetch("https://api.jotform.com/" + endpoint, {
    headers: {
      Accept: "application/json",
      APIKEY: api_key,
    },
    async parseResponse(response) {
      const result = await response.json();
      if (!response.ok) throw new Error((result as ErrorResponse).message || response.statusText);
      return result as SuccessResponse<T>;
    },
    mapResult(result) {
      return {
        data: result.content,
      };
    },
  });
