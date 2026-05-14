export type Mode = "pve" | "pvp";

export interface ClassEntry {
  /** Stable class slug, e.g. "priest" or "death-knight" */
  slug: string;
  /** Human-readable class name */
  name: string;
  /** Accepted input tokens for class-first navigation */
  aliases: string[];
  /** Existing spec icon to reuse as the class tile artwork */
  representativeSpecSlug: string;
}

export interface SpecEntry {
  /** URL slug, e.g. "shadow-priest" */
  slug: string;
  /** PvE role segment used in PvE guide URLs, e.g. "dps" | "healer" | "tank" */
  pveRole: string;
  /** All accepted input tokens that map to this spec (lowercase) */
  aliases: string[];
  /** Per-spec overrides for page urlSuffix values, e.g. hunter pet talents */
  urlSuffixOverrides?: Record<string, string>;
}

export interface PageEntry {
  /** URL suffix appended after the base spec+mode segment */
  urlSuffix: string;
  /** All accepted input tokens for this page (lowercase) */
  aliases: string[];
  /** When true the URL is built differently (no mode segment) */
  special?: boolean;
  /** Human-readable title shown in the grid and action panels */
  displayTitle: string;
}

export interface PageMap {
  pve: PageEntry[];
  pvp: PageEntry[];
  /** Pages that apply regardless of mode (e.g. resources) */
  any: PageEntry[];
}

export interface ParsedInput {
  spec: SpecEntry;
  mode: Mode;
  page: PageEntry;
}

export interface ParseError {
  kind: "unknown-spec" | "unknown-page";
  token: string;
}

export type ParseResult =
  | { ok: true; value: ParsedInput }
  | { ok: false; error: ParseError };

export interface SpecGridItem {
  classEntry: ClassEntry;
  name: string;
  spec: SpecEntry;
}

export type GridState =
  | { kind: "classes"; items: ClassEntry[] }
  | { kind: "specs"; classEntry?: ClassEntry; items: SpecGridItem[] }
  | { kind: "modes"; items: Mode[]; spec: SpecEntry }
  | { kind: "pages"; items: PageEntry[]; mode: Mode; spec: SpecEntry }
  | { kind: "results"; suggestions: Suggestion[] };

export interface RecentEntry {
  /** Unique key: `${specSlug}-${mode}-${urlSuffix}` */
  id: string;
  url: string;
  /** e.g. "Shadow Priest — Gear" */
  title: string;
  specSlug: string;
  addedAt: number;
}

export interface Suggestion {
  /** Stable React key: "{slug}-{mode}-{urlSuffix}" */
  id: string;
  /** Display title, e.g. "Shadow Priest · Gear" */
  title: string;
  /** Shortest query the user could type, e.g. "sp pve gear" */
  subtitle: string;
  /** Fully resolved Icy Veins URL */
  url: string;
  /** Mode this suggestion belongs to (used for List.Section grouping) */
  mode: Mode;
  /** Spec slug (used for filtering/grouping) */
  specSlug: string;
  /** Full URL to the spec icon image */
  icon: string;
}
