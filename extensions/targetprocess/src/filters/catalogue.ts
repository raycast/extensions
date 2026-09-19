import { EntityTypeInfo } from "../api/entityTypes";

/** The largest projection /api/v1/Generals accepts; EntityState is rejected outright. */
export const GENERAL_INCLUDE = "[Id,Name,EntityType[Name],ModifyDate,Project[Name]]";

export const PAGE_SIZE = 50;
/** Used when types have to be filtered after fetching, so the page still fills. */
export const WIDE_PAGE_SIZE = 200;

export function humaniseTypeName(name: string): string {
  return pluralise(name.replace(/([a-z0-9])([A-Z])/g, "$1 $2"));
}

function pluralise(words: string): string {
  if (/[^aeiou]y$/i.test(words)) return `${words.slice(0, -1)}ies`;
  if (/(s|x|z|ch|sh)$/i.test(words)) return `${words}es`;
  return `${words}s`;
}

export function labelFor(name: string): string {
  return humaniseTypeName(name);
}

export function assignableNames(catalogue: EntityTypeInfo[]): string[] {
  return catalogue.filter((type) => type.assignable).map((type) => type.name);
}

export function defaultSelection(catalogue: EntityTypeInfo[]): string[] {
  const assignable = assignableNames(catalogue);
  return assignable.length > 0 ? assignable : catalogue.map((type) => type.name);
}

/** Drops types the current instance does not have, which is what makes a stored selection portable. */
export function normaliseSelection(names: string[], catalogue: EntityTypeInfo[]): string[] {
  const wanted = new Set(names);
  return catalogue.filter((type) => wanted.has(type.name)).map((type) => type.name);
}

export interface SearchPlan {
  collection: "Assignables" | "Generals";
  take: number;
  /** Null when the query already covers exactly the selection. */
  filterTypes: string[] | null;
  filterFinalClientSide: boolean;
  excludeFinalInQuery: boolean;
}

/**
 * Type filtering is deliberately absent from the query. The DSL has no `in` operator, and although
 * `(a) and (b) or (c)` is accepted, the parentheses that would pin down its precedence are rejected -
 * so a server-side type filter could silently mean something other than what was asked for.
 */
export function planSearch(selection: string[], includeFinal: boolean, catalogue: EntityTypeInfo[]): SearchPlan {
  const selected = normaliseSelection(selection, catalogue);
  const assignable = assignableNames(catalogue);
  const usesGeneral = selected.some((name) => !assignable.includes(name));

  if (usesGeneral) {
    return {
      collection: "Generals",
      take: WIDE_PAGE_SIZE,
      filterTypes: selected,
      // General accepts no EntityState clause, so final states can only go client-side.
      filterFinalClientSide: !includeFinal,
      excludeFinalInQuery: false,
    };
  }

  const coversCollection = assignable.length > 0 && assignable.every((name) => selected.includes(name));

  return {
    collection: "Assignables",
    take: coversCollection ? PAGE_SIZE : WIDE_PAGE_SIZE,
    filterTypes: coversCollection ? null : selected,
    filterFinalClientSide: false,
    excludeFinalInQuery: !includeFinal,
  };
}

export function summariseSelection(selection: string[], catalogue: EntityTypeInfo[]): string | undefined {
  const selected = normaliseSelection(selection, catalogue);
  if (catalogue.length === 0) return undefined;
  if (selected.length === 0) return "no types";
  if (selected.length === catalogue.length) return "all types";
  if (sameSet(selected, defaultSelection(catalogue))) return undefined;

  if (selected.length <= 2) return selected.map(labelFor).join(", ").toLowerCase();
  return `${selected.length} of ${catalogue.length} types`;
}

function sameSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const other = new Set(right);
  return left.every((entry) => other.has(entry));
}
