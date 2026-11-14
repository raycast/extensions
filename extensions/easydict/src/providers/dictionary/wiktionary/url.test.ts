import { expect, it } from "vitest";

import { getWiktionaryWebURL } from "./url";

it.each([
  ["hr", "Serbo-Croatian"],
  ["sr", "Serbo-Croatian"],
  ["sl", "Slovene"],
])("opens the Wiktionary language section for %s", (fromLanguage, anchor) => {
  expect(getWiktionaryWebURL({ word: "test", fromLanguage, toLanguage: "en" })).toBe(
    `https://en.wiktionary.org/wiki/test#${anchor}`,
  );
});

it("opens the article without guessing the Norwegian section before lookup", () => {
  expect(getWiktionaryWebURL({ word: "korleis", fromLanguage: "no", toLanguage: "en" })).toBe(
    "https://en.wiktionary.org/wiki/korleis",
  );
});
