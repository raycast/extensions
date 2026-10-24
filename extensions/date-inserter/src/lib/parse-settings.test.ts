import { describe, expect, it } from "vitest";
import { LANGUAGES } from "./locales";
import { parseSettings } from "./parse-settings";

const defaults: Preferences.InsertDate = {
  format1: "yyyy-MM-dd",
  format2: "",
  defaultFormat: "1",
  language: "en",
  weekStart: "0",
  weekNumbers: "off",
};

const parse = (overrides: Partial<Preferences.InsertDate>) => parseSettings({ ...defaults, ...overrides });

describe("parseSettings", () => {
  it("reads the defaults", () => {
    expect(parse({})).toEqual({
      formats: [{ number: 1, pattern: "yyyy-MM-dd" }],
      initialFormatIndex: 0,
      language: LANGUAGES.en,
      weekStartsOn: 0,
      weekNumbering: undefined,
    });
  });

  it("keeps both formats when the second one is set", () => {
    const settings = parse({ format2: " MMM d, yyyy ", defaultFormat: "2" });
    expect(settings.formats).toEqual([
      { number: 1, pattern: "yyyy-MM-dd" },
      { number: 2, pattern: "MMM d, yyyy" },
    ]);
    expect(settings.initialFormatIndex).toBe(1);
  });

  it("falls back to format 1 when the initial format is empty", () => {
    expect(parse({ defaultFormat: "2" }).initialFormatIndex).toBe(0);
  });

  it("uses the default pattern when format 1 is empty", () => {
    expect(parse({ format1: "  " }).formats).toEqual([{ number: 1, pattern: "yyyy-MM-dd" }]);
    expect(parse({ format1: "", format2: "dd.MM.yyyy" }).formats).toEqual([
      { number: 1, pattern: "yyyy-MM-dd" },
      { number: 2, pattern: "dd.MM.yyyy" },
    ]);
  });

  it("reads the calendar options", () => {
    const settings = parse({ language: "ja", weekStart: "1", weekNumbers: "auto" });
    expect(settings.language).toBe(LANGUAGES.ja);
    expect(settings.weekStartsOn).toBe(1);
    expect(settings.weekNumbering).toBe("iso");
    expect(parse({ weekNumbers: "middle-eastern" }).weekNumbering).toBe("middle-eastern");
  });
});
