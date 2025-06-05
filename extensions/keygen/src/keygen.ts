import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ErrorResult, Result } from "./interfaces";

const { account_id, api_token } = getPreferenceValues<Preferences>();
export const useKeygen = <T>(endpoint: string) => 
  useFetch(`https://api.keygen.sh/v1/accounts/${account_id}/${endpoint}`, {
    headers: {
      Accept: "application/vnd.api+json",
      Authorization: `Bearer ${api_token}`,
      "Content-Type": "application/vnd.api+json"
    },
    async parseResponse(response) {
      if (!response.ok) {
        const err: ErrorResult = await response.json();
        throw new Error(err.errors[0].detail);
      }
      const result = await response.json();
      return result;
    },
    mapResult(result: Result<T>) {
      return {
        data: result.data
      }
    },
    execute: false
  })