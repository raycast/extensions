import { MyMindObject } from "./types";

export type MyMindObjectKind = "image" | "video" | "pdf" | "note" | "link" | "saved-item";

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

  if (item.url ?? item.source?.url) {
    return "link";
  }

  return "saved-item";
}
