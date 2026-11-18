export const CONFIG_REFERENCE_URL = "https://docs.otty.sh/reference/configuration";

export type SchemaType = "bool" | "enum" | "enum-list" | "string" | "number" | "list" | "color";

/** One entry of `otty config schema --json` (Otty 1.6.5+). Optional fields are absent or null. */
export type SchemaEntry = {
  /** The kebab-case key `config get`/`set` accept, as written in config.toml. */
  key: string;
  /** The camelCase field `config show` reports it under; null for aliases and write-only keys. */
  field: string | null;
  type: SchemaType | string;
  default: unknown;
  description: string;
  /** The name Otty's Settings window shows. */
  label?: string | null;
  settings?: { pane?: string | null; section?: string | null } | null;
  values?: string[] | null;
  valuesFrom?: string | null;
  min?: number | null;
  max?: number | null;
  platforms?: string[] | null;
  aliasOf?: string | null;
  deprecated?: boolean | null;
  writeOnly?: boolean | null;
  /** A hint such as `Npx | N% | empty`. */
  format?: string | null;
  /** An enum that also takes free text, such as a path. */
  allowsOther?: boolean | null;
  suggestions?: string[] | null;
};

export type Setting = {
  key: string;
  label: string;
  /** The value as `config show --json` reports it. */
  value: unknown;
  /** The value as `config get` prints it, in config-file syntax; a list is one entry per line. */
  text: string;
  customized: boolean;
  /** The config keys this row stands for (`configKeysFor`); Reset unsets all of them. */
  configKeys: string[];
  schema: SchemaEntry;
};

export type SettingGroup = { title: string; pane: string; settings: Setting[] };

export const OTHER_GROUP = "Other";

export function parseConfigSchema(data: unknown): SchemaEntry[] {
  const keys = (data as { keys?: unknown } | undefined)?.keys;
  const valid =
    Array.isArray(keys) &&
    keys.every(
      (entry) =>
        typeof entry?.key === "string" && typeof entry.type === "string" && typeof entry.description === "string",
    );
  if (!valid) throw new Error("Unexpected config schema from Otty CLI");
  return keys as SchemaEntry[];
}

/**
 * Aliases repeat a canonical key, write-only keys have nothing to show, other
 * platforms' keys do nothing on a Mac, and deprecated keys are on their way out.
 * A key set in your config is always listed, as itself, so Reset unsets what you wrote.
 */
export function isListed(entry: SchemaEntry, customized: boolean): boolean {
  if (customized) return true;
  if (entry.aliasOf || entry.writeOnly || entry.deprecated) return false;
  return !entry.platforms || entry.platforms.includes("macos");
}

/** Aliases and write-only keys have no `config show` field, so their value comes from `config get`. */
export function valueFromText(entry: SchemaEntry, text: string): unknown {
  if (entry.type === "bool" && (text === "true" || text === "false")) return text === "true";
  if (entry.type === "list") return text ? text.split("\n") : [];
  return text === "" ? null : text;
}

export function groupTitle(entry: SchemaEntry): string {
  const pane = entry.settings?.pane;
  if (!pane) return OTHER_GROUP;
  const section = entry.settings?.section;
  // Otty files every Advanced setting under one section, "All Settings", which would read as a filter.
  return section && section !== "All Settings" ? `${pane} · ${section}` : pane;
}

/** The panes in Otty's Settings sidebar, top to bottom (Otty 1.6.5). Recipes has no settings in the schema. */
const PANE_ORDER = [
  "General",
  "Shell",
  "Controls",
  "Editor",
  "Agents",
  "View",
  "Appearance",
  "Recipes",
  "Key Bindings",
  "Advanced",
];

/**
 * Otty's own Settings sidebar icons, extracted from its `settings-ui.html.lzma` (Otty 1.6.5) and rendered
 * to 64 px PNGs in `assets/settings-panes/`, named by Otty's pane id (Agents is `integrations`).
 */
const PANE_ICONS: Record<string, string> = {
  General: "general",
  Shell: "shell",
  Controls: "controls",
  Editor: "editor",
  Agents: "integrations",
  View: "view",
  Appearance: "appearance",
  "Key Bindings": "keybindings",
  Advanced: "advanced",
  Data: "data",
  Remote: "remote",
};

/** The asset path of a pane's icon; none for Other or a pane Otty adds later. */
export function paneIcon(pane: string): string | undefined {
  const name = PANE_ICONS[pane];
  return name ? `settings-panes/${name}.png` : undefined;
}

/** Grouped as in Otty's Settings window: by pane, then section; a pane's own settings come before its sections. */
export function groupSettings(settings: Setting[]): SettingGroup[] {
  const groups = new Map<string, SettingGroup>();
  for (const setting of settings) {
    const title = groupTitle(setting.schema);
    const group = groups.get(title);
    if (group) group.settings.push(setting);
    else groups.set(title, { title, pane: setting.schema.settings?.pane || OTHER_GROUP, settings: [setting] });
  }
  // Otty's Settings sidebar order; a pane the sidebar doesn't show (Data, Remote) follows, alphabetically, then Other.
  const rank = (group: SettingGroup) => {
    if (group.pane === OTHER_GROUP) return PANE_ORDER.length + 1;
    const index = PANE_ORDER.indexOf(group.pane);
    return index === -1 ? PANE_ORDER.length : index;
  };
  return [...groups.values()]
    .sort(
      (a, b) =>
        rank(a) - rank(b) ||
        a.pane.localeCompare(b.pane) ||
        Number(a.title !== a.pane) - Number(b.title !== b.pane) ||
        a.title.localeCompare(b.title),
    )
    .map((group) => ({
      ...group,
      settings: group.settings.sort((a, b) => a.label.localeCompare(b.label) || a.key.localeCompare(b.key)),
    }));
}

/** The search-bar dropdown's two views besides a pane name. */
export const ALL_SETTINGS = "all";
export const CUSTOMIZED_SETTINGS = "customized";

/** A pane shows all of its settings; only the Customized view hides the defaults. An unknown pane shows everything. */
export function settingsForView(settings: Setting[], view: string): SettingGroup[] {
  if (view === CUSTOMIZED_SETTINGS) return groupSettings(settings.filter((setting) => setting.customized));
  const groups = groupSettings(settings);
  const pane = groups.filter((group) => group.pane === view);
  return pane.length > 0 ? pane : groups;
}

/** `config show` reports camelCase keys; `config get`/`set` take kebab-case. */
export function toKebabKey(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
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

/** A structured value (`mouse-scroll-multiplier`) reads best the way Otty writes it. */
export function displayValue(setting: Setting): string {
  const { value } = setting;
  if (value !== null && typeof value === "object" && !Array.isArray(value)) return setting.text;
  return formatValue(value);
}

export function defaultText(entry: SchemaEntry): string {
  const value = entry.default;
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "None";
  return formatValue(value);
}

/** A `#rgb`, `#rrggbb` or `#rrggbbaa` value as an opaque swatch color; the alpha is dropped. */
export function colorSwatch(text: string | undefined): string | undefined {
  const match = text?.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/i);
  if (!match || (match[1].length === 3 && match[2])) return undefined;
  return `#${match[1]}`;
}

/**
 * The keys a config.toml sets. A key under `[table]` comes back as `table.key`, so it can't pass
 * for a top-level setting; quoted keys are decoded; lines inside a multiline string are skipped.
 */
export function parseCustomizedKeys(toml: string): Set<string> {
  const keys = new Set<string>();
  let table = "";
  let openString: string | undefined;
  for (const line of toml.split("\n")) {
    if (openString) {
      if (line.includes(openString)) openString = undefined;
      continue;
    }
    const header = line.match(/^\s*\[\s*([^\]]+?)\s*\]\s*(?:#.*)?$/);
    if (header) {
      table = header[1];
      continue;
    }
    const match = line.match(/^\s*(?:"([^"]+)"|'([^']+)'|([A-Za-z0-9_-]+))\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1] ?? match[2] ?? match[3];
    keys.add(table ? `${table}.${key}` : key);
    const multiline = match[4].match(/^("""|''')/);
    if (multiline && !match[4].slice(3).includes(multiline[1])) openString = multiline[1];
  }
  return keys;
}

/** `palette-N = "#…"` lines: Otty reads them, its schema doesn't list them, and `config unset palette` leaves them. */
export const PALETTE_ENTRY = /^palette-\d+$/;

export function paletteEntryKeys(keys: Iterable<string>): string[] {
  return [...keys].filter((key) => PALETTE_ENTRY.test(key));
}

/** The config keys a settings row stands for: the row reads as customized when any is set, and Reset unsets them all. */
export function configKeysFor(key: string, customized: ReadonlySet<string>): string[] {
  const own = customized.has(key) ? [key] : [];
  return key === "palette" ? [...own, ...paletteEntryKeys(customized)] : own;
}

function isNumberType(entry: SchemaEntry): boolean {
  return entry.type === "number";
}

/**
 * The value to save from the edit form. A text setting keeps its spaces (`enquiry-response = " YES "`
 * must survive an unchanged save); every other type is trimmed, since stray spaces there are typos.
 */
export function editedValue(input: string, entry: SchemaEntry): string {
  return entry.type === "string" ? input : input.trim();
}

/** Otty validates numbers and true/false itself, but not enum or theme strings, so those are checked here. */
export function validateEdit(value: string, setting: Setting, theme?: { names?: string[] }): string | undefined {
  if (!value || value === setting.text) return undefined;
  const entry = setting.schema;
  if (theme) return theme.names?.includes(value) ? undefined : "Pick one of Otty's themes";
  if (isNumberType(entry)) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "Enter a number";
    const { min, max } = entry;
    if ((typeof min === "number" && number < min) || (typeof max === "number" && number > max)) {
      return typeof min === "number" && typeof max === "number"
        ? `Enter a number from ${min} to ${max}`
        : typeof min === "number"
          ? `Enter a number of at least ${min}`
          : `Enter a number up to ${max}`;
    }
  }
  const values = choiceValues(entry);
  if (values && !values.includes(value)) return `Use one of: ${values.join(", ")}`;
  return undefined;
}

function choiceValues(entry: SchemaEntry): string[] | undefined {
  return entry.type === "enum" && !entry.allowsOther && entry.values?.length ? entry.values : undefined;
}

/** The picker always offers the current value, so an alias Otty doesn't list survives an edit. */
export function choicesFor(setting: Setting): string[] | undefined {
  const values = choiceValues(setting.schema);
  if (!values) return undefined;
  return setting.customized && !values.includes(setting.text) ? [setting.text, ...values] : values;
}
