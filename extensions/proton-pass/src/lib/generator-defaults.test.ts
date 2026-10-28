import test from "node:test";
import assert from "node:assert/strict";
import { getInitialSettings } from "./generator-defaults";

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
    },
  );
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
