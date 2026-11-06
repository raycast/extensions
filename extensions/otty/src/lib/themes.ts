// Pure helpers for Otty themes. No @raycast/api import, so vitest can exercise
// everything here.

export type ThemeMode = "light" | "dark";

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

/** Decode a TOML basic string's escapes: `\"`, `\\`, `\n`, `\uXXXX`, `\UXXXXXXXX`. */
function decodeBasicString(body: string): string {
  return body.replace(/\\(?:u([0-9A-Fa-f]{4})|U([0-9A-Fa-f]{8})|(.))/g, (match, short, long, char) =>
    short || long ? String.fromCodePoint(parseInt(short ?? long, 16)) : (ESCAPES[char] ?? match),
  );
}

/** A TOML scalar: a "basic" or 'literal' string, or a bare value, minus any `# comment`. */
function tomlValue(raw: string): string {
  const quoted = raw.match(/^"((?:[^"\\]|\\.)*)"|^'([^']*)'/);
  if (quoted) return quoted[2] ?? decodeBasicString(quoted[1]);
  return raw.replace(/\s+#.*$/, "").trim();
}

/** Read the name, mode, and preview colors from an `.ottytheme` TOML file. */
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
    const header = trimmed.match(/^\[([^\]]+)\]$/);
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
 * One entry per theme, by display name. Theme files supply colors; a built-in
 * with no file on disk is listed without them. User entries in `theme list`
 * are named by file slug, so their parsed files stand in for them.
 */
export function buildThemeCatalog(list: ThemeListEntry[], files: Theme[]): Theme[] {
  const byName = new Map(files.map((theme) => [theme.name, theme]));
  for (const entry of list) {
    if (entry.source === "builtin" && !byName.has(entry.name)) {
      byName.set(entry.name, {
        name: entry.name,
        mode: entry.variant === "light" ? "light" : "dark",
      });
    }
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** A small mock window in the theme's colors, like Otty's own theme picker. */
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
