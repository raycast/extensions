import { escape2Html } from "./escapeToHtml";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function getTitleForAlgolis(result: any) {
  const combinedTitle = (titles: Array<string>) => titles.filter((itme) => itme).join(" > ");

  return escape2Html(
    combinedTitle(
      "path" in result || "slug" in result ? [result.title, result.description] : Object.values(result.hierarchy)
    )
  );
}

export function getTitleForMeilisearch(result: any) {
  const combinedTitle = (titles: Array<string>) => titles.filter((itme) => itme).join(" > ");
  const {
    hierarchy_lvl0,
    hierarchy_lvl1,
    hierarchy_lvl2,
    hierarchy_lvl3,
    hierarchy_lvl4,
    hierarchy_lvl5,
    hierarchy_lvl6,
  } = result;

  return escape2Html(
    combinedTitle([
      hierarchy_lvl0,
      hierarchy_lvl1,
      hierarchy_lvl2,
      hierarchy_lvl3,
      hierarchy_lvl4,
      hierarchy_lvl5,
      hierarchy_lvl6,
    ])
  );
}
