import { readFileSync } from "node:fs";
import { join } from "node:path";

import { environment } from "@raycast/api";

// Phrase (lowercase words joined by one space) -> hex. Read once from assets/color-words.txt.
let table: Map<string, string> | null = null;
let longest = 1;

export const parseColorWords = (text: string) => {
  const map = new Map<string, string>();
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    const match = line.match(/^(.+?)\s+(#[0-9a-fA-F]{6})$/);
    if (!match) continue;
    const phrase = match[1].toLowerCase().split(/\s+/).join(" ");
    map.set(phrase, match[2].toUpperCase());
  }
  return map;
};

const load = () => {
  if (table) return table;
  try {
    table = parseColorWords(readFileSync(join(environment.assetsPath, "color-words.txt"), "utf8"));
  } catch {
    table = new Map();
  }
  longest = Math.max(1, ...[...table.keys()].map((k) => k.split(" ").length));
  return table;
};

/** All [phrase, hex] entries from the word list, for searching. */
export const colorWordEntries = (): Array<[string, string]> => [...load().entries()];

const variants = (word: string) => [word, word.replace(/es$/, ""), word.replace(/s$/, "")];

/** Colours named in `name`, in order of appearance, longest phrase first. */
export const guessColors = (name: string, words: Map<string, string> = load()): string[] => {
  const max = words === table ? longest : Math.max(1, ...[...words.keys()].map((k) => k.split(" ").length));
  const tokens = name
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  const found: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    let step = 1;
    for (let len = Math.min(max, tokens.length - i); len >= 1; len--) {
      const head = tokens.slice(i, i + len - 1);
      const last = tokens[i + len - 1];
      const hit = variants(last)
        .map((v) => words.get([...head, v].join(" ")))
        .find(Boolean);
      if (hit) {
        if (!found.includes(hit)) found.push(hit);
        step = len;
        break;
      }
    }
    i += step;
  }
  return found;
};
