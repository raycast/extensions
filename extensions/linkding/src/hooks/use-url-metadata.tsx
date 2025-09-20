import { useFetch } from "@raycast/utils";
import { load } from "cheerio";
import { isValidUrl } from "../util/is-valid-url";

const useUrlMetadata = (url: string) => {
  const { data: metadata } = useFetch(url, {
    mapResult: (response: string) => {
      const $ = load(response);
      const title = $("title").text().trim();
      const description = $("meta[name='description']").attr("content")?.trim();
      return { data: { title, description } };
    },
    // no need to surface, since failure is not critical and could happen for legitimate reasons
    onError: (err) => console.warn(`Failed to fetch metadata from ${url}: ${String(err)}"`),
    execute: isValidUrl(url),
  });
  return metadata;
};

export default useUrlMetadata;
