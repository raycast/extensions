import type { CategoryFilter, CheatsheetItem } from "../types";

function normalize(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

export function getSearchableText(item: CheatsheetItem): string {
  return [
    item.name,
    item.description,
    item.usage,
    ...(item.examples?.flatMap((example) => [example.title, example.command, example.description]) ?? []),
    item.details?.whenToUse,
    ...(item.details?.prerequisites ?? []),
    ...(item.details?.parameters?.flatMap((parameter) => [parameter.name, parameter.description]) ?? []),
    ...(item.details?.workflow?.flatMap((step) => [step.title, step.command, step.description]) ?? []),
    ...(item.details?.notes ?? []),
    item.warning,
    ...(item.tags ?? []),
    ...(item.aliases ?? []),
    ...(item.platforms ?? []),
  ]
    .filter(Boolean)
    .join(" ");
}

function getCommandSearchableValues(item: CheatsheetItem): string[] {
  return [
    item.name,
    item.usage,
    ...(item.examples?.map((example) => example.command) ?? []),
    ...(item.details?.workflow?.map((step) => step.command) ?? []),
    ...(item.aliases ?? []),
  ];
}

function matchesQuery(value: string, query: string): boolean {
  const normalizedValue = normalize(value);
  if (normalizedValue.includes(query)) return true;

  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.length > 1 && tokens.every((token) => normalizedValue.includes(token));
}

export function filterItems(items: CheatsheetItem[], category: CategoryFilter, searchText: string): CheatsheetItem[] {
  const query = normalize(searchText);

  return items.filter((item) => {
    if (category !== "all" && item.category !== category) return false;
    if (!query) return true;

    if (query.startsWith("/")) {
      return getCommandSearchableValues(item).some((value) => matchesQuery(value, query));
    }
    return matchesQuery(getSearchableText(item), query);
  });
}
