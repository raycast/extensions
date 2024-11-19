import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ActiveDomain, Result } from "./types";

const { api_url, api_key } = getPreferenceValues<Preferences>();
  export const headers = {
    Host: "api.sav.com",
    APIKEY: api_key
  }
  export const parseResponse = async <T>(response: Response) => {
    const text = await response.text();
    if (!text.startsWith("{")) throw new Error(response.statusText);
    const result: Result<T> = JSON.parse(text);
    if (!result.request_success) throw new Error(result.error_message);
    return result.response;
  }
export const useGetActiveDomains = () => useFetch(new URL("domains_api_v1/get_active_domains_in_account", api_url).toString(), {
    headers,
    parseResponse,
    mapResult(result: { domain_count: number; domains: ActiveDomain[] }) {
      return {
        data: result.domains
      }
    },
    initialData: []
  })