import { getObjectDisplayTitle } from "./display-title";
import { getObjectKind } from "./object-kind";
import { getObjectBody, getObjectNoteBodies } from "./object-detail";
import { getObjectUrl } from "./object-info";
import { Link, MyMindObject } from "./types";

function getUrlSubtitle(item: MyMindObject): string | undefined {
  const url = getObjectUrl(item);

  if (!url) {
    return undefined;
  }

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function getRelatedObjectIds(objectId: string, links: Link[]): string[] {
  const orderedIds = new Set<string>();

  for (const link of links) {
    if (link.sourceId === objectId) {
      orderedIds.add(link.targetId);
    } else if (link.targetId === objectId) {
      orderedIds.add(link.sourceId);
    }
  }

  return Array.from(orderedIds);
}

export function matchesRelatedItemSearch(item: MyMindObject, searchText: string): boolean {
  const query = searchText.trim().toLowerCase();

  if (!query) {
    return true;
  }

  const haystacks = [
    getObjectDisplayTitle(item),
    getUrlSubtitle(item),
    getObjectUrl(item),
    item.summary,
    getObjectBody(item),
    getObjectKind(item),
    ...item.tags.map((tag) => tag.name),
    ...getObjectNoteBodies(item),
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .map((value) => value.toLowerCase());

  return haystacks.some((value) => value.includes(query));
}
