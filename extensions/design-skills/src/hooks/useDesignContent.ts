import { useFetch } from "@raycast/utils";
import { getRawDesignMdUrl, SITE_BASE_URL } from "../shared";

export function useDesignContent(slug: string | null) {
  return useFetch<string>(slug ? getRawDesignMdUrl(slug) : SITE_BASE_URL, {
    execute: slug !== null,
    parseResponse: async (res) => {
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      return res.text();
    },
    keepPreviousData: false,
  });
}
