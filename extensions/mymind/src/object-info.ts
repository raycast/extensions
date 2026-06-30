import { getObjectKind } from "./object-kind";
import { MyMindObject } from "./types";

export function getObjectUrl(item: MyMindObject): string | undefined {
  return item.url ?? item.source?.url;
}

export function getObjectTypeLabel(item: MyMindObject): string {
  switch (getObjectKind(item)) {
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "pdf":
      return "PDF";
    case "note":
      return "Note";
    case "link":
      return "Link";
    default:
      return "Saved Item";
  }
}

export function getObjectSubtitle(item: MyMindObject): string | undefined {
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
