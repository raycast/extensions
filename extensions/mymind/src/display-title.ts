import { MyMindObject } from "./types";
import { getObjectKind } from "./object-kind";

export function getObjectDisplayTitle(item: MyMindObject): string {
  const explicitTitle = item.title?.trim();

  if (explicitTitle) {
    return explicitTitle;
  }

  switch (getObjectKind(item)) {
    case "image":
      return "Untitled Image";
    case "video":
      return "Untitled Video";
    case "pdf":
      return "Untitled PDF";
    case "note":
      return "Untitled Note";
    case "link":
      return "Untitled Link";
  }

  return "Untitled";
}
