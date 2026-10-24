import { afterEach, describe, expect, it, vi } from "vitest";
import { formatDate } from "./date-format";
import { LANGUAGES } from "./locales";

const date = new Date(2026, 9, 15);

describe("formatDate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("formats with Unicode tokens", () => {
    expect(formatDate(date, "yyyy-MM-dd", LANGUAGES.en.locale)).toEqual({ ok: true, value: "2026-10-15" });
    expect(formatDate(date, "MMM d, yyyy", LANGUAGES.en.locale)).toEqual({ ok: true, value: "Oct 15, 2026" });
    expect(formatDate(date, "yyyy年M月d日", LANGUAGES.ja.locale)).toEqual({ ok: true, value: "2026年10月15日" });
  });

  it("uses the language for names", () => {
    expect(formatDate(date, "EEE", LANGUAGES.en.locale)).toEqual({ ok: true, value: "Thu" });
    expect(formatDate(date, "EEE", LANGUAGES.ja.locale)).toEqual({ ok: true, value: "木" });
    expect(formatDate(date, "MMMM", LANGUAGES.de.locale)).toEqual({ ok: true, value: "Oktober" });
  });

  it("reports invalid patterns instead of throwing", () => {
    // date-fns also warns about YYYY on the console before throwing.
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(formatDate(date, "YYYY-MM-DD", LANGUAGES.en.locale).ok).toBe(false);
    expect(formatDate(date, "yyyy-MM-dd g", LANGUAGES.en.locale).ok).toBe(false);
  });

  it("accepts quoted literal text", () => {
    expect(formatDate(date, "'Q'Q yyyy", LANGUAGES.en.locale)).toEqual({ ok: true, value: "Q4 2026" });
  });
});
