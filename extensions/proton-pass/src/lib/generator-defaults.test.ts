import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getInitialSettings } from "./generator-defaults";

type Manifest = {
  commands: {
    name: string;
    preferences?: { name: string; type: string; title?: string; label?: string; default?: unknown }[];
  }[];
};

test("every Generate Password preference says which type it's for, and keeps its saved name and default", () => {
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as Manifest;
  const preferences = manifest.commands.find((command) => command.name === "generate-password")?.preferences ?? [];
  // A checkbox shows its label next to the box; its title is only a heading above it.
  assert.deepEqual(
    preferences.map(({ name, type, default: value, title, label }) => [name, type, value, label ?? title]),
    [
      ["defaultPasswordType", "dropdown", "random", "Password Type"],
      ["defaultPasswordLength", "textfield", "20", "Random: Length"],
      ["includeUppercase", "checkbox", true, "Random: Uppercase letters"],
      ["includeSymbols", "checkbox", true, "Random: Symbols"],
      ["includeNumbers", "checkbox", true, "Random: Numbers"],
      ["defaultPassphraseWords", "dropdown", "4", "Passphrase: Words"],
      ["passphraseSeparator", "dropdown", "hyphens", "Passphrase: Separator"],
      ["capitalizeWords", "checkbox", true, "Passphrase: Capitalize words"],
      ["passphraseNumbers", "checkbox", true, "Passphrase: Numbers"],
    ],
  );
});

test("starts with the usual defaults when nothing is set", () => {
  assert.deepEqual(getInitialSettings({}), {
    type: "random",
    length: 20,
    words: 4,
    includeNumbers: true,
    includeUppercase: true,
    includeSymbols: true,
    separator: "hyphens",
    capitalize: true,
    passphraseNumbers: true,
  });
});

test("uses the preferences that are set", () => {
  assert.deepEqual(
    getInitialSettings({
      defaultPasswordType: "passphrase",
      defaultPasswordLength: "32",
      defaultPassphraseWords: "6",
      passphraseSeparator: "spaces",
      includeUppercase: false,
      includeSymbols: false,
      includeNumbers: false,
      capitalizeWords: false,
      passphraseNumbers: false,
    }),
    {
      type: "passphrase",
      length: 32,
      words: 6,
      includeNumbers: false,
      includeUppercase: false,
      includeSymbols: false,
      separator: "spaces",
      capitalize: false,
      passphraseNumbers: false,
    },
  );
});

test("random passwords and passphrases each have their own numbers setting", () => {
  const settings = getInitialSettings({ includeNumbers: false, passphraseNumbers: true });
  assert.equal(settings.includeNumbers, false);
  assert.equal(settings.passphraseNumbers, true);
});

test("keeps lengths and word counts in range and ignores unknown values", () => {
  const tooLong = getInitialSettings({ defaultPasswordLength: "500", defaultPassphraseWords: "12" });
  assert.equal(tooLong.length, 128);
  assert.equal(tooLong.words, 10);

  const tooShort = getInitialSettings({ defaultPasswordLength: "4", defaultPassphraseWords: "1" });
  assert.equal(tooShort.length, 8);
  assert.equal(tooShort.words, 3);

  const invalid = getInitialSettings({ defaultPasswordLength: "long", passphraseSeparator: "slashes" });
  assert.equal(invalid.length, 20);
  assert.equal(invalid.separator, "hyphens");
});
