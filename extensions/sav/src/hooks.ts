import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { ActiveDomain, Result } from "./types";
import { generateApiUrl } from "./utils";
import { Response as NodeFetchResponse } from "node-fetch";

const { api_key } = getPreferenceValues<Preferences>();
export const headers = {
  Host: "api.sav.com",
  APIKEY: api_key,
};
export const parseResponse = async <T>(response: Response | NodeFetchResponse) => {
  const text = await response.text();
  if (!text.startsWith("{")) throw new Error(response.statusText);
  const result: Result<T> = JSON.parse(text);
  if (!result.request_success) throw new Error(result.error_message);
  return result.response;
};
export const useGetActiveDomains = () =>
  useFetch(generateApiUrl("get_active_domains_in_account"), {
    headers,
    parseResponse,
    mapResult(result: { domain_count: number; domains: ActiveDomain[] }) {
      return {
        data: result.domains,
      };
    },
    initialData: [],
  });
