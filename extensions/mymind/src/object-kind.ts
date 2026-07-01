import { MyMindObject } from "./types";

export type MyMindObjectKind = "image" | "video" | "pdf" | "note" | "link" | "saved-item";

function hasWebUrl(item: MyMindObject): boolean {
  const candidates = [item.url, item.source?.url, item.mainEntity?.url];

  if (typeof item.mainEntity?.["@id"] === "string") {
    candidates.push(item.mainEntity["@id"]);
  }

  return candidates.some((value) => {
    if (!value) {
      return false;
    }

    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  });
}

export function getObjectKind(item: MyMindObject): MyMindObjectKind {
  if (item.blob?.type?.startsWith("image/")) {
    return "image";
  }

  if (item.blob?.type?.startsWith("video/")) {
    return "video";
  }

  if (item.blob?.type === "application/pdf") {
    return "pdf";
  }

  if (item.content) {
    return "note";
  }

  if (hasWebUrl(item)) {
    return "link";
  }

  return "saved-item";
}
