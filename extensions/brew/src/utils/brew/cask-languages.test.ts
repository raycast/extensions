/**
 * The "Languages" metadata text for a cask — collapses to a count above
 * `LANGUAGES_INLINE_MAX` codes so a 103-entry cask (firefox) doesn't push
 * the list a wall of text.
 */

import { describe, expect, it } from "vitest";
// `helpers.ts` calls `Array.prototype.first()`, installed as a side effect of
// `utils/array`. Importing helpers directly skips the barrel that pulls it in.
import "../array";
import { caskLanguagesText } from "./helpers";

// Real firefox `languages` list (103 codes), fixture captured from
// `brew info --cask --json=v2 firefox` on 2026-09-14.
const FIREFOX_LANGUAGES = [
  "ach",
  "af",
  "an",
  "ar",
  "ast",
  "az",
  "be",
  "bg",
  "bn",
  "br",
  "bs",
  "ca",
  "cak",
  "cs",
  "cy",
  "da",
  "de",
  "dsb",
  "el",
  "en-CA",
  "en-GB",
  "en-US",
  "eo",
  "es-AR",
  "es-CL",
  "es-ES",
  "es-MX",
  "et",
  "eu",
  "fa",
  "ff",
  "fi",
  "fr",
  "fur",
  "fy-NL",
  "ga-IE",
  "gd",
  "gl",
  "gn",
  "gu-IN",
  "he",
  "hi-IN",
  "hr",
  "hsb",
  "hu",
  "hy-AM",
  "ia",
  "id",
  "is",
  "it",
  "ja",
  "ja-JP-mac",
  "ka",
  "kab",
  "kk",
  "km",
  "kn",
  "ko",
  "lij",
  "lt",
  "lv",
  "mk",
  "mr",
  "ms",
  "my",
  "nb-NO",
  "ne-NP",
  "nl",
  "nn-NO",
  "oc",
  "pa-IN",
  "pl",
  "pt-BR",
  "pt-PT",
  "rm",
  "ro",
  "ru",
  "sc",
  "sco",
  "si",
  "sk",
  "skr",
  "sl",
  "son",
  "sq",
  "sr",
  "sv-SE",
  "szl",
  "ta",
  "te",
  "tg",
  "th",
  "tl",
  "tr",
  "trs",
  "uk",
  "ur",
  "uz",
  "vi",
  "xh",
  "zh-CN",
  "zh-TW",
  "zh",
];

describe("caskLanguagesText", () => {
  it("returns undefined when languages is absent", () => {
    expect(caskLanguagesText(undefined)).toBeUndefined();
  });

  it("returns undefined when languages is empty", () => {
    expect(caskLanguagesText([])).toBeUndefined();
  });

  it("joins a short list inline", () => {
    expect(caskLanguagesText(["de", "en"])).toBe("de, en");
  });

  it("joins exactly 8 codes inline", () => {
    const eight = ["a", "b", "c", "d", "e", "f", "g", "h"];
    expect(caskLanguagesText(eight)).toBe("a, b, c, d, e, f, g, h");
  });

  it("collapses 9 codes to a count", () => {
    const nine = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    expect(caskLanguagesText(nine)).toBe("9 languages");
  });

  it("collapses the real firefox list to a count", () => {
    expect(caskLanguagesText(FIREFOX_LANGUAGES)).toBe("103 languages");
  });
});
