export const CONFIG_REFERENCE_URL = "https://docs.otty.sh/reference/configuration";

export type SettingType = "boolean" | "number" | "string" | "list" | "object";

export type Setting = {
  /** The kebab-case key `config get`/`set` accept, as written in config.toml. */
  key: string;
  value: unknown;
  type: SettingType;
  /** The value as `config get` prints it; a list is one entry per line. */
  text: string;
  customized: boolean;
};

export type SettingGroup = { title: string; settings: Setting[] };

/** `config show` reports camelCase keys; `config get`/`set` take kebab-case. */
export function toKebabKey(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
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

/** A `#rgb`, `#rrggbb` or `#rrggbbaa` value as an opaque swatch color; the alpha is dropped. */
export function colorSwatch(text: string | undefined): string | undefined {
  const match = text?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (!match || (match[1].length === 3 && match[2])) return undefined;
  return `#${match[1]}`;
}

export function parseCustomizedKeys(toml: string): Set<string> {
  const keys = new Set<string>();
  for (const line of toml.split("\n")) {
    const match = line.match(/^\s*([A-Za-z0-9_-]+)\s*=/);
    if (match) keys.add(match[1]);
  }
  return keys;
}

function addTo<T>(groups: Map<string, T[]>, key: string, ...items: T[]) {
  const group = groups.get(key);
  if (group) group.push(...items);
  else groups.set(key, [...items]);
}

function toGroups(groups: Map<string, Setting[]>, compareTitles: (a: string, b: string) => number): SettingGroup[] {
  return [...groups.entries()]
    .sort(([a], [b]) => compareTitles(a, b))
    .map(([title, members]) => ({
      title,
      settings: members.sort((a, b) => a.key.localeCompare(b.key)),
    }));
}

const ACRONYMS = new Set(["ipc", "ssh", "vt", "ui", "cli"]);

const titleCase = (word: string) =>
  ACRONYMS.has(word) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1);

export function groupSettings(settings: Setting[]): SettingGroup[] {
  const byWord = new Map<string, Setting[]>();
  for (const setting of settings) addTo(byWord, setting.key.split("-")[0], setting);

  const groups = new Map<string, Setting[]>();
  for (const [word, members] of byWord) {
    addTo(groups, members.length > 1 ? titleCase(word) : "General", ...members);
  }
  return toGroups(groups, (a, b) => a.localeCompare(b));
}

export type SettingDoc = {
  section: string;
  type: string;
  default: string;
  description: string;
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
 * The reference page has an `<h2>` per section, each followed by a
 * Key / Type / Default / Description table.
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

export function groupByDocs(settings: Setting[], docs: Map<string, SettingDoc>): SettingGroup[] {
  const groups = new Map<string, Setting[]>();
  for (const setting of settings) addTo(groups, docs.get(setting.key)?.section || "Other", setting);
  return toGroups(groups, (a, b) => (a === "Other" ? 1 : b === "Other" ? -1 : a.localeCompare(b)));
}

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

export function choicesFor(setting: Setting, doc: SettingDoc | undefined): string[] | undefined {
  if (doc?.type !== "enum" || !doc.values) return undefined;
  return setting.customized && !doc.values.includes(setting.text) ? [setting.text, ...doc.values] : doc.values;
}

export function validateEdit(
  value: string,
  setting: Setting,
  doc: SettingDoc | undefined,
  theme?: { names?: string[] },
): string | undefined {
  if (!value || value === setting.text) return undefined;
  if (theme) return theme.names?.includes(value) ? undefined : "Pick one of Otty's themes";
  const invalid = validateSettingValue(value, doc);
  if (invalid) return invalid;
  if (setting.type === "number" && !Number.isFinite(Number(value))) return "Enter a number";
  return undefined;
}

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
