import { Font } from "./api";

export const ALL_FONTS = "all";

export interface FilterOption {
  value: string;
  title: string;
}

export interface FilterSection {
  title: string;
  options: FilterOption[];
}

// Fontshare tags are free text with variants such as "Poster"/"Posters" or "coding"/"Coding".
function tagKey(tag: string): string {
  const key = tag.toLowerCase();
  return key.length > 3 && key.endsWith("s") ? key.slice(0, -1) : key;
}

function countBy(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function byCount(counts: Map<string, number>): [string, number][] {
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function buildFilterSections(fonts: Font[]): FilterSection[] {
  const categories = countBy(fonts.flatMap((font) => font.categories));
  const licenses = countBy(fonts.flatMap((font) => (font.license ? [font.license] : [])));
  const variableCount = fonts.filter((font) => font.axes.length > 0).length;

  // Label each tag group with its most used spelling.
  const tagLabels = new Map<string, string>();
  for (const [tag] of byCount(countBy(fonts.flatMap((font) => font.tags)))) {
    if (!tagLabels.has(tagKey(tag))) tagLabels.set(tagKey(tag), tag);
  }
  const tags = countBy(fonts.flatMap((font) => [...new Set(font.tags.map(tagKey))]));

  return [
    {
      title: "Categories",
      options: byCount(categories).map(([category, count]) => ({
        value: `category:${category}`,
        title: `${category} (${count})`,
      })),
    },
    {
      title: "Styles",
      options: [{ value: "variable", title: `Variable (${variableCount})` }],
    },
    {
      title: "Uses",
      options: byCount(tags).map(([key, count]) => ({
        value: `tag:${key}`,
        title: `${tagLabels.get(key)} (${count})`,
      })),
    },
    {
      title: "License",
      options: byCount(licenses).map(([license, count]) => ({
        value: `license:${license}`,
        title: `${license} (${count})`,
      })),
    },
  ];
}

export function matchesFilter(font: Font, filter: string): boolean {
  const [kind, ...rest] = filter.split(":");
  const value = rest.join(":");

  switch (kind) {
    case "category":
      return font.categories.includes(value);
    case "variable":
      return font.axes.length > 0;
    case "tag":
      return font.tags.some((tag) => tagKey(tag) === value);
    case "license":
      return font.license === value;
    default:
      return true;
  }
}
