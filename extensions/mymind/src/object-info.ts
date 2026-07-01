import { getObjectKind } from "./object-kind";
import { MyMindObject } from "./types";

function isHttpUrl(value?: string): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getObjectUrl(item: MyMindObject): string | undefined {
  if (isHttpUrl(item.url)) {
    return item.url;
  }

  if (isHttpUrl(item.source?.url)) {
    return item.source?.url;
  }

  if (isHttpUrl(item.mainEntity?.url)) {
    return item.mainEntity?.url;
  }

  if (typeof item.mainEntity?.["@id"] === "string" && isHttpUrl(item.mainEntity["@id"])) {
    return item.mainEntity["@id"];
  }

  return undefined;
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
