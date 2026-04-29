import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { telexTransform } from "./telex.js";

// prettier-ignore
const testCases = [
  // Basic word + tone
  ["cais",                      "cái"],
  ["gif",                       "gì"],
  ["nhaf",                      "nhà"],
  ["nhas",                      "nhá"],
  ["nhar",                      "nhả"],
  ["nhax",                      "nhã"],
  ["nhaj",                      "nhạ"],

  // Tone marker before final consonant
  ["befn",                      "bèn"],
  ["toafn",                     "toàn"],
  ["toanf",                     "toàn"],
  ["majy",                      "mạy"],

  // Scan-back modifier: w reaches past consonants to modify earlier vowel
  ["changwr",                   "chẳng"],
  ["thangwr",                   "thẳng"],

  // uo + w → ươ (horn on both u and o)
  ["muonwj",                    "mượn"],
  ["nguoiwf",                   "người"],
  ["tuoiwf",                    "tười"],

  // Jump-over semivowel modifier (ay + a → ây)
  ["vayaj",                     "vậy"],
  ["cayaj",                     "cậy"],
  ["dayaj",                     "dậy"],
  ["ddayaj",                    "đậy"],

  // Two-letter modifier
  ["baan",                      "bân"],
  ["dee",                       "dê"],
  ["doo",                       "dô"],
  ["ddi",                       "đi"],

  // w modifier
  ["caw",                       "că"],
  ["tuws",                      "tứ"],
  ["mow",                       "mơ"],

  // Tone on second vowel (glide + vowel)
  ["tieengs",                   "tiếng"],
  ["chuaanr",                   "chuẩn"],
  ["hoawcj",                    "hoặc"],
  ["cuas",                      "cúa"],
  ["hoar",                      "hỏa"],

  // Multi-word
  ["cais gif vayaj",            "cái gì vậy"],
  ["tieengs vieetj",            "tiếng việt"],

  // Edge cases
  ["",                          ""],
  ["hello",                     "hello"],
  ["ban",                       "ban"],
  ["NHAS",                      "NHÁ"],

  // ── Onset check: invalid Vietnamese onsets → skip ──
  ["status",                    "status"],
  ["proof",                     "proof"],
  ["stress",                    "stress"],
  ["class",                     "class"],
  ["fix",                       "fix"],
  ["start",                     "start"],
  ["float",                     "float"],
  ["bravo",                     "bravo"],
  ["for",                       "for"],
  ["if",                        "if"],
  ["of",                        "of"],

  // ── SKIP_WORDS: valid onset but known English → skip ──
  ["bus",                       "bus"],
  ["yes",                       "yes"],
];

describe("telexTransform", () => {
  for (const [input, expected] of testCases) {
    it(`${input} → ${expected}`, () => {
      assert.strictEqual(telexTransform(input), expected);
    });
  }
});
