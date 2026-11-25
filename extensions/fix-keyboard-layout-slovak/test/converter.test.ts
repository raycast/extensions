import { test } from "node:test";
import assert from "node:assert/strict";
import { convert, convertDirection, detectDirection } from "../src/converter.ts";

const opts = { keepNumbers: true };

test("EN → SK: example from the README", () => {
  assert.equal(
    convert("Ahoj ako sa m83 kamo3ko, Ma5a m8 nov0 m]so", "en", "sk-qwerty", opts),
    "Ahoj ako sa máš kamoško, Maťa má nové mäso",
  );
});

test("EN → SK: shifted digits become numbers, symbols map correctly", () => {
  assert.equal(convert("Cena je @)@% EUR", "en", "sk-qwerty"), "Cena je 2025 EUR");
  assert.equal(convert("Pre4o\" Lebo;", "en", "sk-qwerty"), "Prečo! Leboô"); // shift+' = !, ; = ô
  assert.equal(convert("Pozor:", "en", "sk-qwerty"), 'Pozor"'); // shift+; = "
  assert.equal(convert("Ako sa m83<", "en", "sk-qwerty"), "Ako sa máš?");
  assert.equal(convert("[plne \\ ;", "en", "sk-qwerty"), "úplne ň ô");
  assert.equal(convert("@UP#", "en", "sk-qwerty"), "2UP3");
  assert.equal(convert("<", "en", "sk-qwerty"), "?");
});

test("EN → SK: uppercase diacritics via Shift on the dead key / letters", () => {
  assert.equal(convert("+DAKUJEM", "en", "sk-qwerty"), "ĎAKUJEM");
  assert.equal(convert("+Skoda", "en", "sk-qwerty"), "Škoda");
});

test("EN → SK: dead keys (´ and ˇ)", () => {
  assert.equal(convert("+dakujem", "en", "sk-qwerty"), "ďakujem");
  assert.equal(convert("=Ostrava, k=un, =lan", "en", "sk-qwerty"), "Óstrava, kún, ĺan");
  assert.equal(convert("+Lubo+s", "en", "sk-qwerty"), "Ľuboš");
  assert.equal(convert("a=", "en", "sk-qwerty"), "a´");
  assert.equal(convert("=1", "en", "sk-qwerty"), "´+");
});

test("EN → SK: keeps standalone numbers when asked", () => {
  assert.equal(convert("rok 2025 a 10.5", "en", "sk-qwerty", opts), "rok 2025 a 10.5");
  assert.equal(convert("rok 2025", "en", "sk-qwerty"), "rok ľéľť");
});

test("SK → EN", () => {
  assert.equal(convert("it§s fine", "sk-qwerty", "en"), "it's fine");
  assert.equal(convert("What_ Hello!", "sk-qwerty", "en"), 'What? Hello"');
  assert.equal(convert("email@domain.com", "sk-qwerty", "en"), "email@domain.com");
  assert.equal(convert("ďakujem", "sk-qwerty", "en"), "+dakujem");
  assert.equal(convert("Óstrava", "sk-qwerty", "en"), "=Ostrava");
  assert.equal(convert("ľščťžýáíé", "sk-qwerty", "en"), "234567890");
});

test("QWERTZ swaps Y and Z", () => {
  assert.equal(convert("yes", "sk-qwertz", "en"), "zes");
  assert.equal(convert("zes", "en", "sk-qwertz"), "yes");
  assert.equal(convert("+yaba", "en", "sk-qwertz"), "žaba");
  assert.equal(convert("žaba", "sk-qwertz", "en"), "6aba"); // ž has its own key
});

test("round trip EN → SK → EN", () => {
  const typed = "M83 +dakujem=, Ma5a! [plne; nov0 m]so<";
  const sk = convert(typed, "en", "sk-qwerty");
  assert.equal(convert(sk, "sk-qwerty", "en"), typed);
});

test("multiline and unknown characters are preserved", () => {
  assert.equal(convert("m83\n\tnov0 😀 €", "en", "sk-qwerty"), "máš\n\tnové 😀 €");
});

test("detectDirection", () => {
  assert.equal(detectDirection("Ahoj ako sa m83"), "en-to-sk");
  assert.equal(detectDirection("it§s fine"), "sk-to-en");
  assert.equal(detectDirection("Hello world"), "en-to-sk");
  assert.equal(detectDirection("Pozdravujem, ďakujem"), "sk-to-en");
  assert.equal(
    convertDirection("Ma5a m8 nov0 m]so", detectDirection("Ma5a m8 nov0 m]so")),
    "Maťa má nové mäso",
  );
});
