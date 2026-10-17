import { test, expect } from "bun:test";
import { transliterate } from "./transliterate";

const cases: [string, string][] = [
  ["namaste", "नमस्ते"],
  ["nepaal", "नेपाल"],
  ["ma ghar jaanchhu", "म घर जान्छु"],
  ["kitaab", "किताब"],
  ["ghar", "घर"],
  ["kt", "क्त"],
  ["ksha", "क्ष"],
  ["Ta", "ट"],
  ["ta", "त"],
  ["chha", "छ"],
  ["kha", "ख"],
  ["a*", "अं"],
  ["a**", "अँ"],
  ["k\\", "क्"],
  ["(2025)", "(2025)"],
];

for (const [roman, deva] of cases) {
  test(`transliterate ${roman}`, () => {
    expect(transliterate(roman)).toBe(deva);
  });
}

test("empty input returns empty", () => {
  expect(transliterate("")).toBe("");
});
