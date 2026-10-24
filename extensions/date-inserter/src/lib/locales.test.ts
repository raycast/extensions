import { format } from "date-fns";
import { describe, expect, it } from "vitest";
import { languageConfig, LANGUAGES } from "./locales";

describe("LANGUAGES", () => {
  it("defines seven weekday labels and valid title formats for every language", () => {
    const date = new Date(2026, 9, 15);
    for (const [code, language] of Object.entries(LANGUAGES)) {
      expect(language.weekdayLabels, code).toHaveLength(7);
      for (const pattern of [language.monthTitleFormat, language.yearTitleFormat, language.monthLabelFormat]) {
        expect(() => format(date, pattern, { locale: language.locale }), `${code}: ${pattern}`).not.toThrow();
      }
    }
  });

  it("titles months the same way as the Obsidian plugin", () => {
    const title = (code: keyof typeof LANGUAGES) =>
      format(new Date(2026, 9, 15), LANGUAGES[code].monthTitleFormat, { locale: LANGUAGES[code].locale });
    expect(title("en")).toBe("October 2026");
    expect(title("ja")).toBe("2026年10月");
    expect(title("ko")).toBe("2026년 10월");
    expect(title("zh-TW")).toBe("2026年10月");
  });

  it("falls back to English for unknown codes", () => {
    expect(languageConfig("xx")).toBe(LANGUAGES.en);
    expect(languageConfig("ja")).toBe(LANGUAGES.ja);
  });
});
