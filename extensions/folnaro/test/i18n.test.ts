import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STRINGS, parseAppleLanguages, resolveLanguage, translator, type StringKey } from "../src/lib/i18n";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("Texts", () => {
  it("has every key in English and German with the same placeholders", () => {
    const keys = Object.keys(STRINGS.en) as StringKey[];
    expect(Object.keys(STRINGS.de).sort()).toEqual([...keys].sort());
    for (const key of keys) {
      expect(STRINGS.de[key].trim(), key).not.toBe("");
      expect(placeholders(STRINGS.de[key]), key).toEqual(placeholders(STRINGS.en[key]));
    }
  });

  it("follows the copy rules: no exclamation marks, German says du", () => {
    for (const language of ["en", "de"] as const) {
      for (const [key, text] of Object.entries(STRINGS[language])) {
        expect(text, `${language} ${key}`).not.toMatch(/!/);
      }
    }
    for (const [key, text] of Object.entries(STRINGS.de)) {
      expect(text, key).not.toMatch(/\b(Sie|Ihr|Ihre|Ihnen)\b/);
    }
  });

  it("uses the glossary terms, not the variants it rules out", () => {
    const de = Object.values(STRINGS.de).join("\n");
    const en = Object.values(STRINGS.en).join("\n");
    for (const banned of ["Quittung", "Steuerberater", "Mehrwertsteuer", "Faktura", "Händler", "Transaktion", "Kanzlei", "Stammdaten", "Festschreib", "ungültig"]) {
      expect(de).not.toContain(banned);
    }
    for (const banned of [/\bcredit note/i, /\baccountant/i, /\bsupplier/i, /\bvoucher/i, /\bcancelled\b/, /\bbooking/i, /\bAI\b/]) {
      expect(en).not.toMatch(banned);
    }
  });

  it("references only keys that exist", () => {
    const sources = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? sources(join(dir, entry.name)) : entry.name.match(/\.tsx?$/) ? [join(dir, entry.name)] : [],
      );
    const keys = new Set(Object.keys(STRINGS.en));
    for (const file of sources(join(__dirname, "..", "src"))) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/\bt\("([a-zA-Z.]+)"/g)) {
        expect(keys.has(match[1]), `${file}: ${match[1]}`).toBe(true);
      }
    }
  });

  it("fills placeholders", () => {
    expect(translator("de")("timer.started", { target: "Website-Relaunch" })).toBe("Der Timer für Website-Relaunch läuft");
    expect(translator("en")("search.overdueBy", { days: 13 })).toBe("13 days overdue");
  });

  it("follows the first macOS language when set to Automatic", () => {
    expect(resolveLanguage("auto", ["de-DE", "en-US"])).toBe("de");
    expect(resolveLanguage("auto", ["en-GB", "de-DE"])).toBe("en");
    expect(resolveLanguage("de", ["en-US"])).toBe("de");
    expect(resolveLanguage(undefined, [])).toBe("en");
    expect(parseAppleLanguages('(\n    "de-DE",\n    "en-DE"\n)\n')).toEqual(["de-DE", "en-DE"]);
    expect(parseAppleLanguages("(\n    en,\n    de\n)")).toEqual(["en", "de"]);
  });
});
