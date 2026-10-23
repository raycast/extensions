import { describe, expect, it } from "vitest";
import { resolveSystemLocale, toLanguageTag } from "../src/lib/locale";

describe("System locale", () => {
  it("converts the macOS region to a language tag", () => {
    expect(toLanguageTag("de_DE\n")).toBe("de-DE");
    expect(toLanguageTag("en_US@calendar=gregorian")).toBe("en-US");
    expect(toLanguageTag("de_CH@rg=atzzzz")).toBe("de-CH");
    expect(toLanguageTag("en")).toBe("en");
  });

  it("rejects values that are not locales", () => {
    expect(toLanguageTag("")).toBeUndefined();
    expect(toLanguageTag("The domain/default pair does not exist")).toBeUndefined();
  });

  it("falls back to Intl's default when the reader fails", () => {
    expect(resolveSystemLocale(() => "de_DE")).toBe("de-DE");
    expect(
      resolveSystemLocale(() => {
        throw new Error("defaults failed");
      }),
    ).toBeUndefined();
    expect(resolveSystemLocale(() => "garbage value")).toBeUndefined();
  });
});
