import { test, expect } from "bun:test";
import { VOWELS_INDEP, VOWELS_MATRA, CONSONANTS, SPECIALS, HALANTA } from "./mappings";

test("vowel tables share identical keys", () => {
  expect(Object.keys(VOWELS_INDEP).sort()).toEqual(Object.keys(VOWELS_MATRA).sort());
});

test("inherent vowel a has empty matra", () => {
  expect(VOWELS_MATRA["a"]).toBe("");
  expect(VOWELS_INDEP["a"]).toBe("अ");
});

test("retroflex vs dental are distinct", () => {
  expect(CONSONANTS["T"]).toBe("ट");
  expect(CONSONANTS["t"]).toBe("त");
});

test("aspirate and conjunct keys present", () => {
  expect(CONSONANTS["chh"]).toBe("छ");
  expect(CONSONANTS["ksh"]).toBe("क्ष");
});

test("specials and halanta", () => {
  expect(SPECIALS["*"]).toBe("ं");
  expect(SPECIALS["**"]).toBe("ँ");
  expect(SPECIALS["\\"]).toBe("्");
  expect(HALANTA).toBe("्");
});
