import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseConfigSchema } from "./settings";
import {
  buildThemeCatalog,
  describeOverrides,
  parseTheme,
  previewFileName,
  themeOverrideKeys,
  unconfirmedKeys,
  themePreviewSvg,
} from "./themes";

const PAPER = `[meta]
name        = "Paper"
mode        = "light"

[terminal]
foreground = "#1A1A1A"
background = "#FCFBF9"
palette = [
    "#1A1A1A", "#A33A3A", "#2B5A38", "#A85A20",
]

[token]
secondary  = "#8C8A80"
tertiary   = "#C1BEB5"
accent    = "#2B5A38"
`;

describe("parseTheme", () => {
  it("reads the name, mode, and preview colors", () => {
    expect(parseTheme(PAPER)).toEqual({
      name: "Paper",
      mode: "light",
      colors: {
        background: "#FCFBF9",
        foreground: "#1A1A1A",
        accent: "#2B5A38",
        secondary: "#8C8A80",
        tertiary: "#C1BEB5",
      },
    });
  });

  it("falls back to palette colors when tokens are missing", () => {
    const theme = parseTheme(
      `[meta]\nname = "Bare"\nmode = "dark"\n[terminal]\nforeground = "#EEEEEE"\nbackground = "#111111"\npalette = ["#000000", "#FF0000", "#00FF00", "#FFFF00", "#0000FF"]\n`,
    );
    expect(theme?.colors).toEqual({
      background: "#111111",
      foreground: "#EEEEEE",
      accent: "#0000FF",
      secondary: "#EEEEEE",
      tertiary: "#EEEEEE",
    });
  });

  it("ignores inline comments and accepts single-quoted strings", () => {
    const theme = parseTheme(
      `[meta]\nname = "My Theme" # personal\nmode = 'light' # bright\n[terminal]\nforeground = '#111111' # ink\nbackground = "#FFFFFF"\n`,
    );
    expect(theme?.name).toBe("My Theme");
    expect(theme?.mode).toBe("light");
    expect(theme?.colors?.foreground).toBe("#111111");
  });

  it("decodes escapes in basic strings, not in literal ones", () => {
    const bare = (name: string) =>
      parseTheme(`[meta]\nname = ${name}\n[terminal]\nforeground = "#111111"\nbackground = "#FFFFFF"\n`)?.name;
    expect(bare('"My \\"Theme\\""')).toBe('My "Theme"');
    expect(bare('"Caf\\u00e9"')).toBe("Café");
    expect(bare('"Back\\\\slash"')).toBe("Back\\slash");
    expect(bare("'C:\\raw\\path'")).toBe("C:\\raw\\path");
  });

  it("reads a table header that ends in a comment", () => {
    expect(parseTheme(PAPER.replace("[meta]", "[meta] # Personal theme"))?.name).toBe(parseTheme(PAPER)?.name);
  });

  it("rejects a file without a name or colors", () => {
    expect(parseTheme('[meta]\nmode = "dark"\n')).toBeUndefined();
  });
});

describe("buildThemeCatalog", () => {
  it("merges built-ins with theme files by display name", () => {
    const catalog = buildThemeCatalog(
      [
        { name: "Paper", source: "builtin", variant: "light" },
        { name: "Night", source: "builtin", variant: "dark" },
        { name: "paper", source: "user", variant: "light" },
      ],
      [parseTheme(PAPER)!],
    );
    expect(catalog.map((t) => [t.name, t.mode, Boolean(t.colors)])).toEqual([
      ["Night", "dark", false],
      ["Paper", "light", true],
    ]);
  });

  // Captured from `otty theme list --json` (Otty 1.6.5), which reports every theme's colors.
  const list = JSON.parse(readFileSync(join(__dirname, "fixtures/theme-list.json"), "utf8")).data;

  it("previews every built-in from Otty's own colors, with or without a theme file", () => {
    const catalog = buildThemeCatalog(list, []);
    const builtins = list.filter((entry: { source: string }) => entry.source === "builtin");
    expect(catalog).toHaveLength(builtins.length);
    expect(catalog.every((theme) => theme.colors)).toBe(true);
    expect(catalog.find((theme) => theme.name === "Acrylic Dark")?.colors).toMatchObject({
      background: "#202020",
      accent: "#60cdff",
    });
  });

  it("prefers Otty's colors for a built-in over its copy on disk", () => {
    const stale = { name: "Acrylic Dark", mode: "dark" as const, colors: { ...parseTheme(PAPER)!.colors! } };
    const catalog = buildThemeCatalog(list, [stale]);
    expect(catalog.find((theme) => theme.name === "Acrylic Dark")?.colors?.background).toBe("#202020");
  });

  it("still names user themes by their file, since Otty lists them by slug", () => {
    const names = buildThemeCatalog(list, [{ ...parseTheme(PAPER)!, name: "Paper Dark" }]).map((t) => t.name);
    expect(names).toContain("Paper Dark");
    expect(names).not.toContain("paper-dark");
  });
});

describe("themePreviewSvg", () => {
  it("paints the window in the background color and the cursor dot in the accent", () => {
    const svg = themePreviewSvg(parseTheme(PAPER)!.colors!);
    expect(svg).toMatch(/^<svg [^>]*><rect width="300" height="200" rx="16" fill="#FCFBF9"\/>/);
    expect(svg).toContain('<circle cx="104" cy="98" r="6" fill="#2B5A38"/>');
    expect(svg.endsWith("</svg>")).toBe(true);
  });
});

describe("previewFileName", () => {
  it("keeps names that slug alike apart", () => {
    expect(previewFileName("My Theme")).toMatch(/^my-theme-[0-9a-f]{8}\.svg$/);
    expect(previewFileName("My Theme")).not.toBe(previewFileName("My-Theme"));
    expect(previewFileName("My Theme")).toBe(previewFileName("My Theme"));
  });
});

describe("themeOverrideKeys", () => {
  const schema = parseConfigSchema(
    JSON.parse(readFileSync(join(__dirname, "fixtures/config-schema.json"), "utf8")).data,
  );

  it("finds the color keys a config sets, which win over any theme", () => {
    const set = [
      "foreground",
      "background",
      "palette-0",
      "palette-15",
      "cursor-color",
      "cursor-text",
      "sidebar-width",
      "theme",
    ];
    expect(themeOverrideKeys(set, schema)).toEqual([
      "foreground",
      "background",
      "palette-0",
      "palette-15",
      "cursor-color",
      "cursor-text",
    ]);
  });

  it("covers selection, UI panel colors and the list form of palette", () => {
    expect(themeOverrideKeys(["selection-background", "ui-accent", "palette"], schema)).toEqual([
      "selection-background",
      "ui-accent",
      "palette",
    ]);
  });

  it("is empty when the config sets no colors", () => {
    expect(themeOverrideKeys(["font-size", "theme", "theme-dark", "palette-x"], schema)).toEqual([]);
  });
});

describe("describeOverrides", () => {
  it("collapses palette entries into one name", () => {
    const keys = ["foreground", "background", ...Array.from({ length: 16 }, (_, i) => `palette-${i}`), "cursor-color"];
    expect(describeOverrides(keys)).toBe("foreground, background, palette (16 colors), cursor-color");
  });

  it("names the list form of palette once, without a count it can't know", () => {
    expect(describeOverrides(["palette", "palette-3"])).toBe("palette");
    expect(describeOverrides(["palette-3"])).toBe("palette (1 color)");
    expect(describeOverrides(["ui-accent"])).toBe("ui-accent");
  });
});

describe("unconfirmedKeys", () => {
  it("names keys set since the user confirmed, which they never agreed to reset", () => {
    expect(unconfirmedKeys(["foreground"], ["foreground", "background"])).toEqual(["background"]);
  });

  it("is empty when nothing new appeared, including when a key went away", () => {
    expect(unconfirmedKeys(["foreground", "background"], ["foreground", "background"])).toEqual([]);
    expect(unconfirmedKeys(["foreground", "background"], ["foreground"])).toEqual([]);
    expect(unconfirmedKeys(["foreground"], [])).toEqual([]);
  });
});
