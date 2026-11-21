import { describe, expect, test } from "bun:test";
import { DEFAULT_LANGUAGE, LANGUAGES, resolveLanguage } from "../languages";

const indonesian = { code: "id", name: "Indonesian" };

describe("languages", () => {
  test("defaults to English", () => {
    expect(DEFAULT_LANGUAGE).toEqual({ code: "en", name: "English" });
  });

  test("uses unique language codes", () => {
    const codes = LANGUAGES.map((language) => language.code);

    expect(new Set(codes).size).toBe(codes.length);
  });

  test("resolves a known language code", () => {
    expect(resolveLanguage("id", DEFAULT_LANGUAGE)).toEqual(indonesian);
  });

  test("falls back for unknown or missing codes", () => {
    expect(resolveLanguage("xx", indonesian)).toBe(indonesian);
    expect(resolveLanguage(undefined, indonesian)).toBe(indonesian);
  });
});
