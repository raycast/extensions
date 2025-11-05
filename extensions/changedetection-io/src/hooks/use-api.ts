import { useFetch } from "@raycast/utils";
import { getUrl, headers } from "@/utils";

export const useApi = <T>(endpoint: string) => {
  const url = getUrl(`api/v1/${endpoint}`);
  return useFetch<T>(url, {
    headers,
  });
};
