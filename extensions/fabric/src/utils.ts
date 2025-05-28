import sanitizeHtml from "sanitize-html";
import { Color } from "@raycast/api";

import { Kind } from "./api/fabricClient";

export function removeHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text) => " " + text.slice(0, 1000),
  });
}

export function getKindIcon(kind: Kind | null) {
  switch (kind) {
    case Kind.DEFAULT_FILE:
      return {
        source: "icons/kind/file.svg",
        tintColor: Color.PrimaryText,
      };
      break;
    case null:
      return {
        source: "icons/kind/all.svg",
        tintColor: Color.PrimaryText,
      };
      break;
    default:
      return {
        source: `icons/kind/${kind}.svg`,
        tintColor: Color.PrimaryText,
      };
  }
}
