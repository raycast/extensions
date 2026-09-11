import * as cheerio from "cheerio";

import { captureException } from "@raycast/api";

export type OramaCreds = {
  projectId: string;
  apiKey: string;
};

/**
 * Parse the Fresh `boot(...)` payload to extract `{projectId, apiKey}`.
 *
 * jsr.io migrated from Next.js (Orama v1: apiKey + indexId) to Fresh
 * (Orama v2: projectId + apiKey). The boot payload encodes a JSON array
 * containing an object whose `projectId`/`apiKey` properties are numeric
 * indexes into the array, pointing at the string values.
 */
export const parseBootPayload = (html: string): OramaCreds | null => {
  const $ = cheerio.load(html);
  let result: OramaCreds | null = null;

  $("script").each((_index, element) => {
    if (result) return;
    const script = $(element).html();
    if (!script || !script.includes("apiKey")) return;

    const match = script.match(/("\[\[(?:[^"\\]|\\.)*\]")/);
    if (!match) return;

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
            result = { projectId, apiKey };
            return;
          }
        }
      }
    } catch (err) {
      captureException(err);
    }
  });

  return result;
};
