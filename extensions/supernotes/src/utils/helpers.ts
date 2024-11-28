import { getPreferenceValues } from "@raycast/api";

import type { ISimpleCard } from "~/utils/types";

// Typed getPreferenceValues
export const getSupernotesPrefs = getPreferenceValues<ExtensionPreferences>;

// Convert a text selection to a simple card
export const textToSimpleCard = (text: string): ISimpleCard | null => {
  if (!text) return null;
  const body = text.trim();
  const tags = ["raycast"];
  for (const match of text.match(/(?:^|[^#\\])#([A-Za-z0-9_])+(?!#)/g) ?? []) {
    const tag = match.replace(/^#|#$/, "").trim();
    if (tag.length) tags.push(tag);
  }
  return { name: "", markup: body, tags, source: "raycast" };
};
