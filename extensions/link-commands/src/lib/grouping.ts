import { categoryName, environmentName, facetsOf, packageLabel, type Facets } from "./convention";
import type { ScriptCommand } from "./types";

export const ALL_FILTER = "all";

export type FilterKind = "environment" | "brand" | "category";

/**
 * The dropdown holds three axes in one control, so each value carries its own kind. Encoding it into
 * the string keeps the selection a single piece of state — a `{kind, value}` pair would have to be
 * serialised here anyway, since `List.Dropdown` deals in strings.
 */
export const filterValue = (kind: FilterKind, value: string) => `${kind}:${value}`;

const parseFilter = (selected: string) => {
  const separator = selected.indexOf(":");
  if (separator === -1) return undefined;

  return { kind: selected.slice(0, separator) as FilterKind, value: selected.slice(separator + 1) };
};

export const matchesFilter = (facets: Facets, selected: string) => {
  if (selected === ALL_FILTER) return true;

  const filter = parseFilter(selected);
  if (!filter) return true;

  if (filter.kind === "environment") return facets.environment === filter.value;
  if (filter.kind === "brand") return facets.brand === filter.value;

  return facets.category === filter.value;
};

export type CommandEntry = {
  command: ScriptCommand;
  facets: Facets;
};

export type CommandSection = {
  key: string;
  title: string;
  entries: CommandEntry[];
};

const UNSCOPED = "\u{10FFFF}"; // sorts last, and cannot collide with a real environment name

const countLabel = (total: number) => `${total} command${total === 1 ? "" : "s"}`;

/**
 * Environment is the only axis that becomes a section, because it is the only one you are ever *in*:
 * a scoped set is a mode, and mixing work into the same run as personal is the mistake worth
 * preventing visually. Category and package stay filters — a flat list ordered by package already
 * puts every Google command together, so cutting it further by category would fragment that for
 * nothing. Unscoped commands come first and scoped ones last, so the exception is what you scroll to.
 */
export const sectionsFor = (commands: ScriptCommand[], selected: string, grouped: boolean): CommandSection[] => {
  const entries = commands
    .map((command) => ({ command, facets: facetsOf(command) }))
    .filter((entry) => matchesFilter(entry.facets, selected));

  // Ordering by package rather than by name is what makes the flat list navigable: it gathers every
  // command of a service together without a header per service.
  const byPackage = (left: CommandEntry, right: CommandEntry) =>
    (left.facets.brand ?? "").localeCompare(right.facets.brand ?? "") ||
    left.facets.name.localeCompare(right.facets.name);

  if (!grouped) {
    const sorted = [...entries].sort(byPackage);
    return sorted.length > 0 ? [{ key: "all", title: countLabel(sorted.length), entries: sorted }] : [];
  }

  const buckets = new Map<string, CommandEntry[]>();

  for (const entry of entries) {
    const key = entry.facets.environment ?? UNSCOPED;
    buckets.set(key, [...(buckets.get(key) ?? []), entry]);
  }

  // Filtering by environment already pins the axis the sections are cut on, so naming them would
  // restate the dropdown. Filtering by category or package does not — knowing which results are
  // work still tells you something.
  const environmentIsPinned = parseFilter(selected)?.kind === "environment";

  // Sorted explicitly rather than by a high sentinel: `localeCompare` collates rather than comparing
  // code points, so a "sorts last" character does not reliably sort last.
  return [...buckets.entries()]
    .sort(([left], [right]) => {
      if (left === UNSCOPED) return -1;
      if (right === UNSCOPED) return 1;
      return left.localeCompare(right);
    })
    .map(([key, sectionEntries]) => ({
      key,
      title:
        key === UNSCOPED || environmentIsPinned
          ? countLabel(sectionEntries.length)
          : `${environmentName(key)} · ${countLabel(sectionEntries.length)}`,
      entries: [...sectionEntries].sort(byPackage),
    }));
};

export type FilterOption = { value: string; title: string; count: number };

export type FilterOptions = {
  environments: FilterOption[];
  brands: FilterOption[];
  categories: FilterOption[];
};

const options = (values: (string | undefined)[], kind: FilterKind, label: (value: string) => string) => {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([value, count]) => ({ value: filterValue(kind, value), title: `${label(value)} (${count})`, count }));
};

export const filterOptions = (commands: ScriptCommand[]): FilterOptions => {
  const facets = commands.map(facetsOf);

  return {
    environments: options(
      facets.map((facet) => facet.environment),
      "environment",
      environmentName,
    ),
    brands: options(
      facets.map((facet) => facet.brand),
      "brand",
      packageLabel,
    ),
    categories: options(
      facets.map((facet) => facet.category),
      "category",
      categoryName,
    ),
  };
};
