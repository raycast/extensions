import { test } from "node:test";
import assert from "node:assert/strict";
import { transliterateLatinToCyrillic } from "./translit.ts";

const CASES: Array<[string, string]> = [
  ["Privet", "Привет"],
  ["Zhenya", "Женя"],
  ["SHHUKA", "ЩУКА"],
  ["shchuka", "щука"],
  // NFD-decomposed "ö" (o + combining diaeresis) must NFC-normalize to "ö" and match ё
  ["\u00f6".normalize("NFD"), "ё"],
  ["OB#EKT", "ОБЪЕКТ"],
  // "'" is the soft sign (ь), not the hard sign: taking case from context gives
  // lowercase ь here (see README "dobryj den'" -> "добрый день")
  ["Ob'ekt", "Обьект"],
  // explicit uppercase soft-sign marker in an all-caps word
  ["OB''EKT", "ОБЬЕКТ"],
  // explicit uppercase sign markers keep their case even without letter context
  ["##", "Ъ"],
  ["''", "Ь"],
  ["##EKT", "ЪЕКТ"],
  // Documented collision: "it's" intends "ит'с"-ish input, maps to итьс
  ["it's", "итьс"],
  ["", ""],
  // Non-mapped characters (emoji) pass through untouched
  ["🙂 privet 🙂", "🙂 привет 🙂"],
];

for (const [input, expected] of CASES) {
  test(`transliterates "${input}" to "${expected}"`, () => {
    assert.equal(transliterateLatinToCyrillic(input), expected);
  });
}
