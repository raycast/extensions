import { describe, expect, it } from "vitest";
import { buildThemeCatalog, parseTheme, themePreviewSvg } from "./themes";

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
});

describe("themePreviewSvg", () => {
  it("paints the theme's background and accent", () => {
    const svg = themePreviewSvg(parseTheme(PAPER)!.colors!);
    expect(svg).toContain('fill="#FCFBF9"');
    expect(svg).toContain('fill="#2B5A38"');
    expect(svg.startsWith("<svg")).toBe(true);
  });
});
