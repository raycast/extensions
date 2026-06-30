import { MyMindObject } from "./types";

export function getObjectDisplayTitle(item: MyMindObject): string {
  const explicitTitle = item.title?.trim();

  if (explicitTitle) {
    return explicitTitle;
  }

  if (item.blob?.type?.startsWith("image/")) {
    return "Untitled Image";
  }

  if (item.blob?.type?.startsWith("video/")) {
    return "Untitled Video";
  }

  if (item.blob?.type === "application/pdf") {
    return "Untitled PDF";
  }

  if (item.content) {
    return "Untitled Note";
  }

  if (item.url ?? item.source?.url) {
    return "Untitled Link";
  }

  return "Untitled";
}
