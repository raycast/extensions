import { Image } from "@raycast/api";
import { ClassName, Deck } from "./domain";

export const classIcon = (className: ClassName) => {
  return {
    source: `${className}.png`,
    mask: Image.Mask.Circle,
  };
};

export const ellipsize = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) {
    return str;
  } else {
    return str.substring(0, maxLength - 1) + "…";
  }
};

export type CacheEntry = {
  timestamp: number;
  decks: Deck[];
};
