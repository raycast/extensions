import * as cheerio from "cheerio";

import { environment } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type SearchAPIData = {
  apiKey: string;
  indexId: string;
};
type SearchAPIDataResponse = {
  v: Array<Array<object | SearchAPIData> | Array<never>>;
};

/**
 * This function will download the frontpage of jsr.io and extract the apiKey + indexId from the script tags.
 *
 * It's a bit of a dirty trick, because we need the API key and indexId to use the Orama search (same as on the website)
 *
 * @returns {SearchAPIData | null} - The apiKey + indexId.
 */
export const useSearchAPIData = () => {
  return useFetch<SearchAPIData | null>("https://jsr.io", {
    method: "GET",
    headers: {
      Agent: `Raycast/${environment.raycastVersion} ${environment.extensionName} (https://raycast.com)`,
    },
    keepPreviousData: true,
    parseResponse: async (response) => {
      let res: SearchAPIData | null = null;
      const text = await response.text();
      const $ = cheerio.load(text);

      const scriptElements = $("script");

      scriptElements.each((_index, element) => {
        const script = $(element).html();

        if (script?.includes(`apiKey`)) {
          const start = script.indexOf(`"[[`) + 1;
          const end = script.indexOf(`]"`) + 1;
          const slice = script.slice(start, end).replace(/\\/g, "");
          try {
            const arr = JSON.parse(slice);
            // find element that is string and starts with 'jsr-'
            const indexIdPosition = arr.findIndex(
              (item: unknown) => typeof item === "string" && item.startsWith("jsr-"),
            );
            if (indexIdPosition !== -1 && indexIdPosition > 0 && typeof arr[indexIdPosition - 1] === "string") {
              res = { apiKey: arr[indexIdPosition - 1], indexId: arr[indexIdPosition] };
            }
            // eslint-disable-next-line no-empty
          } catch {}
        }

        if (script?.includes(`"apiKey"`)) {
          const json = JSON.parse(script) as SearchAPIDataResponse;
          const searchAPIData = json.v[0].find((item) => "apiKey" in item && "indexId" in item) as
            | SearchAPIData
            | undefined;
          if (searchAPIData) {
            res = searchAPIData;
          }
        }
      });

      return res;
    },
  });
};
