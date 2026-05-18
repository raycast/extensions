import * as cheerio from "cheerio";

import { captureException, environment } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type SearchAPIData = {
  projectId: string;
  apiKey: string;
};

/**
 * Download the jsr.io frontpage and extract the Orama Cloud `projectId` + `apiKey`
 * from the Fresh `boot(...)` payload.
 *
 * jsr.io migrated from Next.js (Orama v1: apiKey + indexId) to Fresh
 * (Orama v2: projectId + apiKey). The boot payload encodes a JSON array
 * containing an object whose `projectId`/`apiKey` properties are numeric
 * indexes into the array, pointing at the string values.
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

      $("script").each((_index, element) => {
        const script = $(element).html();
        if (!script || !script.includes("apiKey")) {
          return;
        }

        const match = script.match(/("\[\[(?:[^"\\]|\\.)*\]")/);
        if (!match) {
          return;
        }

        try {
          const bootStr = JSON.parse(match[1]) as string;
          const arr = JSON.parse(bootStr) as unknown[];
          for (const item of arr) {
            if (
              item &&
              typeof item === "object" &&
              "projectId" in item &&
              "apiKey" in item &&
              typeof (item as Record<string, unknown>).projectId === "number" &&
              typeof (item as Record<string, unknown>).apiKey === "number"
            ) {
              const pi = (item as Record<string, number>).projectId;
              const ai = (item as Record<string, number>).apiKey;
              const projectId = arr[pi];
              const apiKey = arr[ai];
              if (typeof projectId === "string" && typeof apiKey === "string") {
                res = { projectId, apiKey };
                return;
              }
            }
          }
        } catch (err) {
          captureException(err);
        }
      });

      return res;
    },
  });
};
