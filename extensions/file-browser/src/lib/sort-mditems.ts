import type { Item, SortMode } from "./types";

const compareStrings = (left: string | null | undefined, right: string | null | undefined) => {
  const normalizedLeft = left?.toLocaleLowerCase() ?? "\uffff";
  const normalizedRight = right?.toLocaleLowerCase() ?? "\uffff";
  return normalizedLeft.localeCompare(normalizedRight, undefined, { sensitivity: "base" });
};

const compareNumbers = (left: number | null | undefined, right: number | null | undefined) => {
  const normalizedLeft = typeof left === "number" && Number.isFinite(left) ? left : Number.POSITIVE_INFINITY;
  const normalizedRight = typeof right === "number" && Number.isFinite(right) ? right : Number.POSITIVE_INFINITY;
  return normalizedLeft - normalizedRight;
};

const parseDate = (value: number | string | null | undefined) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value * 1000 : Number.POSITIVE_INFINITY;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return numeric * 1000;
    }
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp)) {
      return timestamp;
    }
  }
  return Number.POSITIVE_INFINITY;
};

const dateAddedValue = (item: Item) => {
  const parsed = parseDate(item.fsContentChangeDate);
  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return typeof item.fsCreationDate === "number" && Number.isFinite(item.fsCreationDate)
    ? item.fsCreationDate
    : Number.POSITIVE_INFINITY;
};

const comparators: Record<SortMode, (a: Item, b: Item) => number> = {
  "name-asc": (a, b) => compareStrings(a.name, b.name),
  "kind-asc": (a, b) => compareStrings(a.kind, b.kind),
  "date-last-opened-asc": (a, b) => compareNumbers(parseDate(a.lastUsedDate), parseDate(b.lastUsedDate)),
  "date-added-desc": (a, b) => compareNumbers(dateAddedValue(a), dateAddedValue(b)),
  "date-modified-asc": (a, b) =>
    compareNumbers(parseDate(a.contentModificationDate), parseDate(b.contentModificationDate)),
  "date-created-asc": (a, b) => compareNumbers(parseDate(a.fsCreationDate), parseDate(b.fsCreationDate)),
  "size-asc": (a, b) => compareNumbers(a.size, b.size),
  "tags-asc": (a, b) => {
    const leftTags = a.userTags.map((tag) => tag.name ?? "").join("\u0000") || "\uffff";
    const rightTags = b.userTags.map((tag) => tag.name ?? "").join("\u0000") || "\uffff";
    return compareStrings(leftTags, rightTags);
  },
};

export function sortMdItems(data: Item[], mode: SortMode) {
  const entries = [...data];
  entries.sort(comparators[mode]);
  return entries;
}
