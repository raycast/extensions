import { KeyValueHierarchy, SpatieDocsHit } from "../types";
import striptags from "striptags";

export function hierarchyToArray(hierarchy: KeyValueHierarchy) {
  return Object.values(hierarchy)
    .filter((hierarchyEntry: string | unknown) => hierarchyEntry)
    .map((hierarchyEntry: string) => hierarchyEntry.replace("&amp;", "&").replace("# #", ""));
}

export function getTitle(hit: SpatieDocsHit): string {
  return hierarchyToArray(hit.hierarchy).pop() || "";
}

export function getSubTitle(hit: SpatieDocsHit): string {
  const highlightResult = striptags(hit._highlightResult?.content?.value || "");

  if (highlightResult) {
    return highlightResult;
  }

  const hierarchy = hierarchyToArray(hit.hierarchy) || [];
  hierarchy.pop();
  return hierarchy.length ? `-> ${hierarchy.join(" > ")}` : "";
}
