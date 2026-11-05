import MiniSearch, { type Query } from "minisearch";
import { doubleMetaphone } from "double-metaphone";
import type { CatalogWallpaper } from "./wallpaper-catalog";

const primaryFields = ["name", "artist", "tags", "searchTerms"];
const secondaryFields = ["description", "genre", "movement"];
const minimumFuzzyLength = 4;
const artistStopWords = new Set(["the", "of", "and"]);
const suffixes = ["ness", "ism", "ic", "ly", "y", "s"];
const tokenize: (text: string) => string[] = MiniSearch.getDefault("tokenize");

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function phoneticKeys(value: string): string[] {
  return [...new Set(doubleMetaphone(value))].filter(Boolean);
}

function stem(term: string): string {
  if (/(sh|ch|x|ss|z)es$/.test(term)) return term.slice(0, -2);
  for (const suffix of suffixes) {
    if (
      term.endsWith(suffix) &&
      term.length - suffix.length >= minimumFuzzyLength
    ) {
      return term.slice(0, -suffix.length);
    }
  }
  return term;
}

function artistKeys(artist: string) {
  const words = tokenize(normalize(artist.replace(/\(.*?\)/g, ""))).filter(
    Boolean,
  );
  const names = words.map((_, index) => words.slice(index).join(""));
  return {
    artistKey: names.join(" "),
    artistSound: names.slice(0, -1).flatMap(phoneticKeys).join(" "),
    surnameSound: names.slice(-1).flatMap(phoneticKeys).join(" "),
  };
}

/** Matches the web gallery's artist-first, then strict, then fuzzy search.
 * Source: anotherboring.day's Gallery search, verified 2026-10-28.
 */
export function createWallpaperSearch(wallpapers: CatalogWallpaper[]) {
  const index = new MiniSearch({
    fields: [
      ...primaryFields,
      ...secondaryFields,
      "artistKey",
      "artistSound",
      "surnameSound",
    ],
    extractField: (document, field) => {
      const value = document[field];
      return Array.isArray(value) ? value.join(" ") : (value ?? "");
    },
    processTerm: (term) => normalize(term) || null,
  });
  index.addAll(
    wallpapers.map((wallpaper) => ({
      ...wallpaper,
      ...artistKeys(wallpaper.artist),
    })),
  );

  const find = (queries: Query[]) =>
    new Set(index.search({ combineWith: "AND", queries }).map(({ id }) => id));

  return (query: string): CatalogWallpaper[] => {
    const words = tokenize(normalize(query)).filter(Boolean);
    if (!words.length) return wallpapers;

    // An exact artist query must not include other artists whose descriptions
    // happen to mention that name (or phonetically similar surnames).
    if (!words.some((word) => artistStopWords.has(word))) {
      const artists = find(
        words.map((word) => ({
          queries: [word],
          fields: ["artist", "artistKey"],
        })),
      );
      if (artists.size) return wallpapers.filter(({ id }) => artists.has(id));
    }

    const match = (fuzzy: boolean) =>
      find(
        words.map((word): Query => ({
          combineWith: "OR",
          queries: [
            {
              queries: [fuzzy ? word : stem(word)],
              fields: [...primaryFields, "artistKey"],
              prefix: true,
              fuzzy: fuzzy
                ? (term) => term.length >= minimumFuzzyLength && 0.2
                : false,
            },
            {
              queries: [stem(word)],
              fields: secondaryFields,
              prefix: true,
            },
            ...(word.length >= minimumFuzzyLength
              ? [
                  {
                    queries: phoneticKeys(word),
                    fields: fuzzy
                      ? ["artistSound", "surnameSound"]
                      : ["artistSound"],
                  },
                ]
              : []),
          ],
        })),
      );

    const strictMatches = match(false);
    const matches = strictMatches.size ? strictMatches : match(true);
    return wallpapers.filter(({ id }) => matches.has(id));
  };
}
