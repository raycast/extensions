import { JsDelivrNpmResponse, IconJson } from "./types";
import fetch, { Request } from "node-fetch";

export const loadLatestVersion = async () => {
  const response = await fetch(
    new Request("https://data.jsdelivr.com/v1/packages/npm/simple-icons", {
      // @ts-expect-error: Ingnore cache
      cache: "no-cache",
    }),
  );
  const json = (await response.json()) as JsDelivrNpmResponse;
  return json.tags.latest;
};

export const loadJson = async (simpleIconsVersion: string) => {
  const response = await fetch(
    `https://cdn.jsdelivr.net/npm/simple-icons@${simpleIconsVersion}/_data/simple-icons.json`,
  );
  const json = (await response.json()) as IconJson;
  return json;
};

export const loadSvg = async (simpleIconsVersion: string, slug: string) => {
  const iconUrl = `https://cdn.jsdelivr.net/npm/simple-icons@${simpleIconsVersion}/icons/${slug}.svg`;
  const response = await fetch(iconUrl);
  const svg = await response.text();
  return svg;
};
