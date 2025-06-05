import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ErrorResult, Result } from "./interfaces";

const { account_id, api_token } = getPreferenceValues<Preferences>();
export const API_URL = `https://api.keygen.sh/v1/accounts/${account_id}/`;
export const headers = {
      Accept: "application/vnd.api+json",
      Authorization: `Bearer ${api_token}`,
      "Content-Type": "application/vnd.api+json"
    };
    
export const parseResponse = async (response: Response) => {
  if (!response.ok) {
    const err: ErrorResult = await response.json();
    throw new Error(err.errors[0].detail);
  }
  const result = await response.json();
  return result;
}
export const useKeygen = <T>(endpoint: string, { execute }: {execute: boolean} = {execute: true}) => 
  useFetch(API_URL + endpoint, {
    headers,
    parseResponse,
    mapResult(result: Result<T>) {
      return {
        data: result.data
      }
    },
    execute
  })