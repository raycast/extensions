import sanitizeHtml from "sanitize-html";

import { Kind } from "./api/fabricClient";

export function removeHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
    textFilter: (text) => " " + text.slice(0, 1000),
  });
}

export function getKindIcon(kind: Kind | null) {
  // This automatically applies the dark mode.
  const tintColor = {
    dark: "#ffffff",
    light: "#000000",
  };

  switch (kind) {
    case Kind.DEFAULT_FILE:
      return {
        source: "icons/kind/file.svg",
        tintColor,
      };
    case null:
      return {
        source: "icons/kind/all.svg",
        tintColor,
      };
    default:
      return {
        source: `icons/kind/${kind}.svg`,
        tintColor,
      };
  }
}
