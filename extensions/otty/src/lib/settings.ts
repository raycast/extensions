// Pure helpers for Otty's `config` CLI. No @raycast/api import, so vitest can
// exercise everything here.

export type SettingType = "boolean" | "number" | "string" | "list" | "object";

export type Setting = {
  /** The kebab-case key `config get`/`set` accept, as written in config.toml. */
  key: string;
  value: unknown;
  type: SettingType;
  /** The value as `config get` prints it; a list is one entry per line. */
  text: string;
  /** Set explicitly in config.toml, rather than left at Otty's default. */
  customized: boolean;
};

export type SettingGroup = { title: string; settings: Setting[] };

/** `config show` reports camelCase keys; `config get`/`set` take kebab-case. */
export function toKebabKey(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

export function buildConfigGetArgs(key: string): string[] {
  return ["config", "get", key];
}

/** `--` keeps a value such as `-1` from being read as a flag. */
export function buildConfigSetArgs(key: string, value: string): string[] {
  return ["config", "set", key, "--", value];
}

export function buildConfigUnsetArgs(key: string): string[] {
  return ["config", "unset", key];
}

export function settingType(value: unknown): SettingType {
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return "number";
  if (Array.isArray(value)) return "list";
  if (value !== null && typeof value === "object") return "object";
  return "string";
}

export function formatValue(value: unknown): string {
  if (typeof value === "boolean") return value ? "On" : "Off";
  if (value === null || value === "") return "Not set";
  if (Array.isArray(value)) {
    if (value.length === 0) return "None";
    return `${value.length} ${value.length === 1 ? "entry" : "entries"}`;
  }
  if (typeof value === "object") return "Table";
  return String(value);
}

/** Keys a config.toml assigns explicitly, in file order. */
export function parseCustomizedKeys(toml: string): Set<string> {
  const keys = new Set<string>();
  for (const line of toml.split("\n")) {
    const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*=/);
    if (match) keys.add(match[1]);
  }
  return keys;
}

const ACRONYMS = new Set(["ipc", "ssh", "vt", "ui", "cli"]);

const titleCase = (word: string) =>
  ACRONYMS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1);

/** Group by the key's leading word; groups of one fold into "General". */
export function groupSettings(settings: Setting[]): SettingGroup[] {
  const byWord = new Map<string, Setting[]>();
  for (const setting of settings) {
    const word = setting.key.split("-")[0];
    byWord.set(word, [...(byWord.get(word) ?? []), setting]);
  }

  const groups = new Map<string, Setting[]>();
  for (const [word, members] of byWord) {
    const title = members.length > 1 ? titleCase(word) : "General";
    groups.set(title, [...(groups.get(title) ?? []), ...members]);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, members]) => ({
      title,
      settings: members.sort((a, b) => a.key.localeCompare(b.key)),
    }));
}

/** One documented key from Otty's configuration reference. */
export type SettingDoc = {
  section: string;
  type: string;
  default: string;
  description: string;
  /** Allowed values, for an enum whose description lists them. */
  values?: string[];
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  nbsp: " ",
};

function plainText(fragment: string): string {
  return fragment
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name) => ENTITIES[name])
    .replace(/\u200b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** `Values: <code>a</code>, <code>b</code> (also <code>c</code>).` → `["a", "b"]` */
function allowedValues(descriptionHtml: string): string[] | undefined {
  const start = descriptionHtml.indexOf("Values:");
  if (start === -1) return undefined;
  const rest = descriptionHtml.slice(start + "Values:".length);
  // The list ends at its sentence's period; codes in the list hold no periods.
  const end = rest.search(/\.(\s|<|$)/);
  const list = (end === -1 ? rest : rest.slice(0, end)).replace(/\([^)]*\)/g, "");
  const values = [...list.matchAll(/<code>(.*?)<\/code>/g)].map((match) => plainText(match[1]));
  return values.length > 0 ? values : undefined;
}

/**
 * Parse https://docs.otty.sh/reference/configuration: an `<h2>` per section,
 * each followed by a Key / Type / Default / Description table.
 */
export function parseConfigReference(html: string): Map<string, SettingDoc> {
  const docs = new Map<string, SettingDoc>();
  let section = "";
  for (const match of html.matchAll(/<h2[^>]*>(.*?)<\/h2>|<tr>(.*?)<\/tr>/gs)) {
    if (match[1] !== undefined) {
      section = plainText(match[1]);
      continue;
    }
    const cells = [...match[2].matchAll(/<td>(.*?)<\/td>/gs)].map((cell) => cell[1]);
    if (cells.length !== 4) continue;
    const [key, type, defaultValue, description] = cells;
    const values = allowedValues(description);
    docs.set(plainText(key), {
      section,
      type: plainText(type),
      default: plainText(defaultValue),
      description: plainText(description),
      ...(values ? { values } : {}),
    });
  }
  return docs;
}

/** Group by documented section, alphabetically; undocumented keys last. */
export function groupByDocs(settings: Setting[], docs: Map<string, SettingDoc>): SettingGroup[] {
  const groups = new Map<string, Setting[]>();
  for (const setting of settings) {
    const title = docs.get(setting.key)?.section || "Other";
    groups.set(title, [...(groups.get(title) ?? []), setting]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)))
    .map(([title, members]) => ({
      title,
      settings: members.sort((a, b) => a.key.localeCompare(b.key)),
    }));
}

/** An error message for a value the reference says is invalid, else undefined. */
export function validateSettingValue(value: string, doc: SettingDoc | undefined): string | undefined {
  if (!doc) return undefined;
  if (doc.type === "integer" && !/^-?\d+$/.test(value)) {
    return "Enter a whole number";
  }
  if (doc.type === "float" && !Number.isFinite(Number(value))) {
    return "Enter a number";
  }
  if (doc.type === "enum" && doc.values && !doc.values.includes(value)) {
    return `Use one of: ${doc.values.join(", ")}`;
  }
  return undefined;
}

/** Keys added, removed, and changed between two documentation snapshots. */
export function diffDocs(
  before: Record<string, SettingDoc>,
  after: Record<string, SettingDoc>,
): { added: string[]; removed: string[]; changed: string[] } {
  const sorted = (keys: string[]) => keys.sort((a, b) => a.localeCompare(b));
  return {
    added: sorted(Object.keys(after).filter((key) => !(key in before))),
    removed: sorted(Object.keys(before).filter((key) => !(key in after))),
    changed: sorted(
      Object.keys(after).filter((key) => key in before && JSON.stringify(before[key]) !== JSON.stringify(after[key])),
    ),
  };
}
