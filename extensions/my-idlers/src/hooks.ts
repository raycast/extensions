import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type ErrorResponse = {
    result: "fail";
    messages: {
        [key: string]: string[];
    } | {
        message: string;
    }
}
export default function useGet<T>(endpoint: string) {
    const { url, api_key }= getPreferenceValues<Preferences>();
    const api_url = new URL(`api/${endpoint}`, url).toString();
  return useFetch(api_url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${api_key}`,
    },
    async parseResponse(response) {
      const result = await response.json()
      if (!response.ok) throw new Error((result as Error).message);
      return result as T[];
    }, 
    initialData: []
  })
}