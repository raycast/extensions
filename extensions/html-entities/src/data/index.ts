import Fuse from "fuse.js";

export interface HTMLElement {
  name: string;
  uni: string;
  hex: string;
  htmlcode: string;
  htmlentity: string | null;
  css: string;
}

import arrows from "./arrows";
import currency from "./currency";
import letters from "./letters";
import math from "./math";
import numbers from "./numbers";
import punctuation from "./punctuation";
import symbols from "./symbols";

const elementsAll: HTMLElement[] = [
  ...arrows,
  ...currency,
  ...letters,
  ...math,
  ...numbers,
  ...punctuation,
  ...symbols,
];

const uniqueElementsMap = elementsAll.reduce(
  (acc, cur) => {
    if (!acc[cur.name]) {
      acc[cur.name] = cur;
    }
    return acc;
  },
  {} as Record<string, HTMLElement>,
);

export const elements = Object.values(uniqueElementsMap);

const fuse = new Fuse(elements, {
  keys: ["name", "htmlcode"],
  includeScore: true,
  includeMatches: true,
});

export const getElements = (query?: string) => {
  if (!query || query === "") {
    return elements;
  }
  const results = fuse.search(query);
  return results.map((result) => result.item);
};
