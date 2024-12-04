import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type ErrorResponse = {
    result: "fail";
    messages: {
        [key: string]: string[];
    }
} | {
  message: string;
}
export default function useGet<T>(endpoint: string, { execute }= {execute: true}) {
    const { url, api_key }= getPreferenceValues<Preferences>();
    const api_url = new URL(`api/${endpoint}`, url).toString();
  return useFetch(api_url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${api_key}`,
    },
    async parseResponse(response) {
      if (!response.ok) {
        const result: ErrorResponse = await response.json();
        if ("message" in result) throw new Error(result.message);
        throw new Error(Object.values(result.messages)[0][0]);
      }
      const result: T[] = await response.json();
      return result;
    }, 
    initialData: [],
    execute
  })
}