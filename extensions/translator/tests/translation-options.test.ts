import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  enabledLanguagePreferences,
  type TranslationLanguagePreferences,
} from "../src/translation-language-preferences.ts";

const DEFAULT_LANGUAGE_PREFERENCES: TranslationLanguagePreferences = {
  showSpanish: true,
  showEnglish: true,
  showBrazilianPortuguese: true,
  showFrench: false,
  showGerman: false,
  showItalian: false,
  showJapanese: false,
  showKorean: false,
  showSimplifiedChinese: false,
};

test("keeps the three existing languages enabled by default in the manifest", () => {
  const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
    preferences: Array<{ name: string; default?: unknown }>;
  };
  const manifestDefaults = Object.fromEntries(
    manifest.preferences
      .filter((preference) => preference.name.startsWith("show"))
      .map((preference) => [preference.name, preference.default]),
  );

  assert.deepEqual(manifestDefaults, DEFAULT_LANGUAGE_PREFERENCES);
});

test("shows the three existing languages with default preferences", () => {
  assert.deepEqual(enabledLanguagePreferences(DEFAULT_LANGUAGE_PREFERENCES), [
    "showSpanish",
    "showEnglish",
    "showBrazilianPortuguese",
  ]);
});

test("shows only the languages selected in preferences", () => {
  assert.deepEqual(
    enabledLanguagePreferences({
      ...DEFAULT_LANGUAGE_PREFERENCES,
      showSpanish: false,
      showEnglish: false,
      showBrazilianPortuguese: false,
      showFrench: true,
      showJapanese: true,
      showSimplifiedChinese: true,
    }),
    ["showFrench", "showJapanese", "showSimplifiedChinese"],
  );
});

test("supports disabling every target language", () => {
  assert.deepEqual(
    enabledLanguagePreferences({
      showSpanish: false,
      showEnglish: false,
      showBrazilianPortuguese: false,
      showFrench: false,
      showGerman: false,
      showItalian: false,
      showJapanese: false,
      showKorean: false,
      showSimplifiedChinese: false,
    }),
    [],
  );
});
