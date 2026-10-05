import type { Visibility } from "./book";
import { isOneOf } from "./validation";
import { VISIBILITIES } from "./book";
import { matchesQuery } from "./text";

export interface Filterable {
  title: string;
  authors: readonly string[];
  language: string;
  categories: readonly string[];
  visibility?: Visibility;
}

export type BookFilter =
  | { kind: "all" }
  | { kind: "language"; code: string }
  | { kind: "category"; name: string }
  | { kind: "visibility"; visibility: Visibility };

export const ALL_FILTER = "all";

export function encodeFilter(filter: BookFilter): string {
  switch (filter.kind) {
    case "all":
      return ALL_FILTER;
    case "language":
      return `language:${filter.code}`;
    case "category":
      return `category:${filter.name}`;
    case "visibility":
      return `visibility:${filter.visibility}`;
  }
}

export function decodeFilter(value: string): BookFilter {
  const separator = value.indexOf(":");
  if (separator === -1) {
    return { kind: "all" };
  }
  const kind = value.slice(0, separator);
  const argument = value.slice(separator + 1);
  if (kind === "language" && argument !== "") {
    return { kind, code: argument };
  }
  if (kind === "category" && argument !== "") {
    return { kind, name: argument };
  }
  if (kind === "visibility" && isOneOf(VISIBILITIES, argument)) {
    return { kind, visibility: argument };
  }
  return { kind: "all" };
}

function matchesFilter(item: Filterable, filter: BookFilter): boolean {
  switch (filter.kind) {
    case "all":
      return true;
    case "language":
      return item.language === filter.code;
    case "category":
      return item.categories.includes(filter.name);
    case "visibility":
      return item.visibility === filter.visibility;
  }
}

export function filterBooks<T extends Filterable>(items: readonly T[], filter: BookFilter, query: string): T[] {
  return items.filter(
    (item) =>
      matchesFilter(item, filter) && matchesQuery([item.title, ...item.authors, ...item.categories].join(" "), query),
  );
}

export interface Facets {
  languages: string[];
  categories: string[];
}

export function collectFacets(items: readonly Filterable[]): Facets {
  const languages = new Set<string>();
  const categories = new Set<string>();
  for (const item of items) {
    languages.add(item.language);
    item.categories.forEach((category) => categories.add(category));
  }
  return { languages: [...languages].sort(), categories: [...categories].sort() };
}
