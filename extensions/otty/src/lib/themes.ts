import { createHash } from "node:crypto";
import { PALETTE_ENTRY } from "./settings";

export type ThemeMode = "light" | "dark";

/** The config key holding each mode's theme; `theme-dark` applies only with auto-switching on. */
export const THEME_KEYS: Record<ThemeMode, string> = { light: "theme", dark: "theme-dark" };
export const AUTO_DARK_MODE_KEY = "auto-theme-dark-mode";

/** Keys in the config now that weren't in the list the user confirmed: they must be asked about first. */
export function unconfirmedKeys(confirmed: string[], current: string[]): string[] {
  return current.filter((key) => !confirmed.includes(key));
}

/** "foreground, palette (16 colors)": one `palette` entry however the config spells it. */
export function describeOverrides(keys: string[]): string {
  const entries = keys.filter((key) => PALETTE_ENTRY.test(key)).length;
  const names: string[] = [];
  for (const key of keys) {
    if (key !== "palette" && !PALETTE_ENTRY.test(key)) names.push(key);
    else if (!names.some((name) => name.startsWith("palette"))) {
      names.push(keys.includes("palette") ? "palette" : `palette (${entries} ${entries === 1 ? "color" : "colors"})`);
    }
  }
  return names.join(", ");
}

/**
 * The keys a config sets that take priority over every theme's colors: the schema's color keys
 * (foreground, background, cursor, selection, UI panel) and the palette. Otty also reads
 * `palette-N = "#…"` lines, which aren't schema keys and which `config unset palette` leaves
 * in place, so each must be unset by its own name (measured on Otty 1.6.5, 2026-11-14).
 */
export function themeOverrideKeys(customized: Iterable<string>, schema: { key: string; type: string }[]): string[] {
  const colorKeys = new Set(schema.filter((entry) => entry.type === "color").map((entry) => entry.key));
  return [...customized].filter((key) => colorKeys.has(key) || key === "palette" || PALETTE_ENTRY.test(key));
}

export type ThemeColors = {
  background: string;
  foreground: string;
  accent: string;
  secondary: string;
  tertiary: string;
};

export type Theme = { name: string; mode: ThemeMode; colors?: ThemeColors };

export type ThemeListEntry = {
  name: string;
  source: string;
  variant: string;
  /** Since Otty 1.6.5; also carries `surface`, which the preview doesn't use. */
  colors?: ThemeColors;
};

const HEX = /#[0-9A-Fa-f]{3,8}\b/g;

const ESCAPES: Record<string, string> = {
  b: "\b",
  t: "\t",
  n: "\n",
  f: "\f",
  r: "\r",
  '"': '"',
  "\\": "\\",
};

function decodeBasicString(body: string): string {
  return body.replace(/\\(?:u([0-9A-Fa-f]{4})|U([0-9A-Fa-f]{8})|(.))/g, (match, short, long, char) =>
    short || long ? String.fromCodePoint(parseInt(short ?? long, 16)) : (ESCAPES[char] ?? match),
  );
}

function tomlValue(raw: string): string {
  const quoted = raw.match(/^"((?:[^"\\]|\\.)*)"|^'([^']*)'/);
  if (quoted) return quoted[2] ?? decodeBasicString(quoted[1]);
  return raw.replace(/\s+#.*$/, "").trim();
}

export function parseTheme(toml: string): Theme | undefined {
  const values = new Map<string, string>();
  const palette: string[] = [];
  let section = "";
  let inPalette = false;

  for (const line of toml.split("\n")) {
    const trimmed = line.trim();
    if (inPalette) {
      palette.push(...(trimmed.match(HEX) ?? []));
      if (trimmed.includes("]")) inPalette = false;
      continue;
    }
    const header = trimmed.match(/^\[([^\]]+)\]\s*(?:#.*)?$/);
    if (header) {
      section = header[1];
      continue;
    }
    const pair = trimmed.match(/^([A-Za-z0-9_-]+)\s*=\s*(.*)$/);
    if (!pair) continue;
    const [, key, raw] = pair;
    if (section === "terminal" && key === "palette") {
      palette.push(...(raw.match(HEX) ?? []));
      inPalette = !raw.includes("]");
      continue;
    }
    values.set(`${section}.${key}`, tomlValue(raw));
  }

  const name = values.get("meta.name");
  const background = values.get("terminal.background");
  const foreground = values.get("terminal.foreground");
  if (!name || !background || !foreground) return undefined;

  return {
    name,
    mode: values.get("meta.mode") === "light" ? "light" : "dark",
    colors: {
      background,
      foreground,
      // ANSI blue is palette index 4.
      accent: values.get("token.accent") ?? palette[4] ?? foreground,
      secondary: values.get("token.secondary") ?? foreground,
      tertiary: values.get("token.tertiary") ?? foreground,
    },
  };
}

/**
 * One entry per theme, by display name. `theme list` gives every built-in's
 * colors; it lists user themes by file slug (`paper-dark`) while the config
 * holds their display name (`Paper Dark`), so their parsed files stand in for them.
 */
export function buildThemeCatalog(list: ThemeListEntry[], files: Theme[]): Theme[] {
  const byName = new Map(files.map((theme) => [theme.name, theme]));
  for (const entry of list) {
    if (entry.source !== "builtin") continue;
    const file = byName.get(entry.name);
    byName.set(entry.name, {
      name: entry.name,
      mode: file?.mode ?? (entry.variant === "light" ? "light" : "dark"),
      colors: entry.colors ? pickColors(entry.colors) : file?.colors,
    });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function pickColors({ background, foreground, accent, secondary, tertiary }: ThemeColors): ThemeColors {
  return { background, foreground, accent, secondary, tertiary };
}

export function themePreviewSvg(colors: ThemeColors): string {
  const { background, foreground, accent, secondary, tertiary } = colors;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">`,
    `<rect width="300" height="200" rx="16" fill="${background}"/>`,
    `<rect x="18" y="20" width="36" height="8" rx="4" fill="${tertiary}"/>`,
    `<rect x="18" y="36" width="36" height="8" rx="4" fill="${accent}" opacity="0.5"/>`,
    `<rect x="18" y="52" width="36" height="8" rx="4" fill="${tertiary}" opacity="0.6"/>`,
    `<circle cx="104" cy="98" r="6" fill="${accent}"/>`,
    `<rect x="120" y="94" width="80" height="8" rx="4" fill="${foreground}" opacity="0.7"/>`,
    `<rect x="120" y="110" width="130" height="7" rx="3.5" fill="${secondary}" opacity="0.6"/>`,
    `<rect x="120" y="124" width="100" height="7" rx="3.5" fill="${tertiary}" opacity="0.6"/>`,
    `</svg>`,
  ].join("");
}

export function previewFileName(name: string): string {
  const slug = name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase();
  return `${slug}-${createHash("sha1").update(name).digest("hex").slice(0, 8)}.svg`;
}
