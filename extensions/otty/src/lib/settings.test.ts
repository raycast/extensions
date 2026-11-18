import { describe, expect, it } from "vitest";
import { colorSwatch, configKeysFor, formatValue, paletteEntryKeys, parseCustomizedKeys, toKebabKey } from "./settings";

describe("toKebabKey", () => {
  it("converts config show's camelCase to config set's kebab-case", () => {
    expect(toKebabKey("ipcAllowSendKeys")).toBe("ipc-allow-send-keys");
    expect(toKebabKey("ctrlCAction")).toBe("ctrl-c-action");
    expect(toKebabKey("theme")).toBe("theme");
  });
});

describe("formatValue", () => {
  it("renders values for an accessory", () => {
    expect(formatValue(true)).toBe("On");
    expect(formatValue(false)).toBe("Off");
    expect(formatValue(13)).toBe("13");
    expect(formatValue(null)).toBe("Not set");
    expect(formatValue("")).toBe("Not set");
    expect(formatValue([])).toBe("None");
    expect(formatValue(["a", "b"])).toBe("2 entries");
    expect(formatValue(["a"])).toBe("1 entry");
  });
});

describe("parseCustomizedKeys", () => {
  it("reads the keys a config.toml sets explicitly", () => {
    const toml = [
      "# comment",
      'theme = "Paper"',
      "font-size = 13",
      "  copy-on-select=true",
      "[section]",
      'env = ["A=1"]',
      'x = "a = b"',
    ].join("\n");
    expect([...parseCustomizedKeys(toml)]).toEqual([
      "theme",
      "font-size",
      "copy-on-select",
      "section.env",
      "section.x",
    ]);
  });

  it("decodes quoted keys, as TOML allows", () => {
    const toml = ['"foreground" = "#eeeeee"', "'background' = '#111111'"].join("\n");
    expect([...parseCustomizedKeys(toml)]).toEqual(["foreground", "background"]);
  });

  it("names a key under a table by its table, so it can't pass for a top-level setting", () => {
    const toml = ["[codex]", 'background = "#111111"', "[ ui ] # note", "x = 1"].join("\n");
    expect([...parseCustomizedKeys(toml)]).toEqual(["codex.background", "ui.x"]);
  });

  it("skips lines inside a multiline string", () => {
    const toml = ['notes = """', 'background = "#111111"', '"""', "font-size = 13", "s = '''", "x = 1", "'''"].join(
      "\n",
    );
    expect([...parseCustomizedKeys(toml)]).toEqual(["notes", "font-size", "s"]);
  });
});

describe("paletteEntryKeys", () => {
  it("finds the palette-N lines Otty reads but its schema doesn't list", () => {
    expect(paletteEntryKeys(["palette-0", "palette", "font-size", "palette-15", "palette-x"])).toEqual([
      "palette-0",
      "palette-15",
    ]);
  });
});

describe("colorSwatch", () => {
  it("reads hex colors, dropping any alpha", () => {
    expect(colorSwatch("#1a1a1a")).toBe("#1a1a1a");
    expect(colorSwatch("#FFF")).toBe("#FFF");
    expect(colorSwatch("#2b5a3880")).toBe("#2b5a38");
  });

  it("ignores anything that is not a hex color", () => {
    for (const text of ["(auto)", "(theme)", "", undefined, "#12345", "#abcd", "red", "1a1a1a"]) {
      expect(colorSwatch(text)).toBeUndefined();
    }
  });
});

describe("configKeysFor", () => {
  it("is the key itself when the config sets it", () => {
    expect(configKeysFor("font-size", new Set(["font-size", "theme"]))).toEqual(["font-size"]);
    expect(configKeysFor("font-size", new Set(["theme"]))).toEqual([]);
  });

  it("gives the palette row its palette-N lines, so it reads as customized and Reset removes them", () => {
    expect(configKeysFor("palette", new Set(["palette-0", "font-size", "palette-15"]))).toEqual([
      "palette-0",
      "palette-15",
    ]);
    expect(configKeysFor("palette", new Set(["palette", "palette-3"]))).toEqual(["palette", "palette-3"]);
  });
});
