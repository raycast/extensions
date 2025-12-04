import { useFetch } from "@raycast/utils";
import { extractDescription, extractTitle } from "../util/extract-html";
import { isValidUrl } from "../util/is-valid-url";

const useUrlMetadata = (url: string) => {
  const { data: metadata } = useFetch(url, {
    mapResult: (html: string) => {
      // assume what we need is in the first few KB
      const initialSegment = html.slice(0, 8192);
      return {
        data: {
          title: extractTitle(initialSegment),
          description: extractDescription(initialSegment),
        },
      };
    },
    // no need to surface, since failure is not critical and could happen for legitimate reasons
    onError: (err) => console.warn(`Failed to fetch metadata from ${url}: ${String(err)}"`),
    execute: isValidUrl(url),
  });
  return metadata;
};

export default useUrlMetadata;
