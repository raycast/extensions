import iconData from "./icons.json";

type IconEntry = { viewBox: string; body: string };

export const ICONS = iconData as Record<string, IconEntry>;
export const ICON_NAMES = Object.keys(ICONS);

export function iconTitle(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Accepts "rocket", "Rocket", "RocketIcon" or "Rocket Icon" and returns the canonical kebab-case name. */
export function resolveIconName(input: string): string | undefined {
  const normalized = input
    .trim()
    .replace(/Icon$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase();
  if (ICONS[normalized]) return normalized;
  const compact = normalized.replace(/-/g, "");
  return ICON_NAMES.find((name) => name.replace(/-/g, "") === compact);
}

export function searchIcons(query: string, limit = 30): string[] {
  const terms = query
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(Boolean);
  if (terms.length === 0) return ICON_NAMES.slice(0, limit);
  const scored = ICON_NAMES.map((name) => {
    const score = terms.reduce((total, term) => {
      if (name === term) return total + 10;
      if (name.split("-").includes(term)) return total + 5;
      if (name.includes(term)) return total + 2;
      return total;
    }, 0);
    return { name, score };
  });
  return scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ name }) => name);
}
