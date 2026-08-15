import assert from "node:assert/strict";
import test from "node:test";
import { estimateVisualWidth, scrambleText } from "../src/scramble-text";

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function structure(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\p{L}/gu, "L")
    .replace(/\p{N}/gu, "N");
}

function separators(text: string): string[] {
  return text.normalize("NFD").replace(/\p{M}/gu, "").split(/\p{L}+|\p{N}+/gu);
}

function caseMask(text: string): string {
  return Array.from(text)
    .filter((char) => /\p{L}/u.test(char))
    .map((char) => (char !== char.toLowerCase() && char === char.toUpperCase() ? "U" : "l"))
    .join("");
}

test("preserves layout structure exactly", () => {
  const source = "A quiet title\n\nDesign\twith soul — always.\nhello@example.com · 2026 ✦";
  const result = scrambleText(source, { random: seededRandom(1) });

  assert.equal(structure(result), structure(source));
  assert.deepEqual(separators(result), separators(source));
  assert.notEqual(result, source);
});

test("preserves Unicode structure and untouched characters", () => {
  const source = "Élan naïve · 東京 — ２０２６ ✦";
  const result = scrambleText(source, { random: seededRandom(8) });

  assert.equal(structure(result), structure(source));
  assert.deepEqual(separators(result), separators(source));
  assert.equal(caseMask(result), caseMask(source));
});

test("leaves text without letters or numbers unchanged", () => {
  const source = "  — ✦\n\t…  ";

  assert.equal(scrambleText(source, { random: seededRandom(9) }), source);
});

test("preserves casing patterns", () => {
  const source = "Quiet QUIET qUiEt ÉLAN";
  const result = scrambleText(source, { random: seededRandom(2) });

  assert.equal(caseMask(result), caseMask(source));
});

test("treats Unicode titlecase letters as uppercase", () => {
  const result = scrambleText("ǅuro ǈub", { random: seededRandom(33) });
  const letters = Array.from(result).filter((char) => /\p{L}/u.test(char));

  assert.match(letters[0], /^[A-Z]$/);
  assert.match(letters[4], /^[A-Z]$/);
});

test("maps repeated words consistently within one selection", () => {
  const result = scrambleText("Shape shape SHAPE", { random: seededRandom(3) });
  const words = result.split(" ");

  assert.equal(words[0].toLowerCase(), words[1].toLowerCase());
  assert.equal(words[1].toLowerCase(), words[2].toLowerCase());
});

test("keeps generated ASCII casing stable for Turkish letter forms", () => {
  const result = scrambleText("Iİıi", { random: seededRandom(31) });
  const withoutMarks = result.normalize("NFD").replace(/\p{M}/gu, "");

  assert.match(withoutMarks, /^[A-Z]{2}[a-z]{2}$/);
});

test("maps canonically equivalent accented words safely in either order", () => {
  ["é e\u0301", "e\u0301 é"].forEach((source, index) => {
    const result = scrambleText(source, { random: seededRandom(32 + index) });
    const words = result.split(" ");

    assert.equal(words[0].normalize("NFC"), words[1].normalize("NFC"));
    assert.equal(
      words[0].normalize("NFD").replace(/\p{M}/gu, ""),
      words[1].normalize("NFD").replace(/\p{M}/gu, ""),
    );
    assert.equal(structure(result), structure(source));
    assert.deepEqual(separators(result), separators(source));
  });
});

test("preserves structural invariants across adversarial Unicode input", () => {
  const fixtures = [
    "ǅuro e\u0301lan ÉLAN\n٢٠٢٦ · 𝟚𝟘𝟚𝟞",
    "Iİıi — naïve\n東京\t२०२६",
    "A\u0301 Á É é e\u0301 · Ⅷ ½ ²",
  ];

  for (let seed = 1; seed <= 40; seed++) {
    fixtures.forEach((source, fixtureIndex) => {
      const result = scrambleText(source, { random: seededRandom(seed * 10 + fixtureIndex) });

      assert.equal(structure(result), structure(source));
      assert.deepEqual(separators(result), separators(source));
    });
  }
});

test("scrambles every numeral without changing numeric structure", () => {
  const source = "2026 / 03 / 14";
  const result = scrambleText(source, { random: seededRandom(4) });
  const sourceDigits = Array.from(source).filter((char) => /\p{N}/u.test(char));
  const resultDigits = Array.from(result).filter((char) => /\p{N}/u.test(char));

  assert.equal(structure(result), structure(source));
  assert.ok(resultDigits.every((digit, index) => digit !== sourceDigits[index]));
});

test("preserves the writing system of Unicode decimal digits", () => {
  const samples = [
    { source: "2026", pattern: /^[0-9]+$/ },
    { source: "２０２６", pattern: /^[０-９]+$/ },
    { source: "٢٠٢٦", pattern: /^[٠-٩]+$/ },
    { source: "۲۰۲۶", pattern: /^[۰-۹]+$/ },
    { source: "२०२६", pattern: /^[०-९]+$/ },
    { source: "২০২৬", pattern: /^[০-৯]+$/ },
    { source: "𝟚𝟘𝟚𝟞", pattern: /^[𝟘-𝟡]+$/u },
  ];

  samples.forEach(({ source, pattern }, index) => {
    const result = scrambleText(source, { random: seededRandom(index + 20) });
    const sourceDigits = Array.from(source);

    assert.match(result, pattern);
    assert.ok(Array.from(result).every((digit, digitIndex) => digit !== sourceDigits[digitIndex]));
  });
});

test("preserves non-decimal numeric symbols that cannot be safely shape-matched", () => {
  const source = "Ⅷ · ½ · ²";

  assert.equal(scrambleText(source, { random: seededRandom(30) }), source);
});

test("can preserve numerals when preference is disabled", () => {
  const result = scrambleText("Edition 2026", { random: seededRandom(5), scrambleNumbers: false });

  assert.equal(result.slice(-4), "2026");
});

test("keeps estimated line measure close across varied outputs", () => {
  const source = [
    "Stories deserve more than a template.",
    "We shape complex ideas into clear, compelling worlds.",
    "Quiet confidence. Human texture. A little bit of magic.",
  ].join("\n");
  const sourceLines = source.split("\n");

  for (let seed = 1; seed <= 50; seed++) {
    const resultLines = scrambleText(source, { random: seededRandom(seed) }).split("\n");

    sourceLines.forEach((line, index) => {
      const difference = Math.abs(estimateVisualWidth(resultLines[index]) - estimateVisualWidth(line));
      assert.ok(difference / estimateVisualWidth(line) < 0.055);
    });
  }
});

test("avoids harsh three-letter consonant or vowel runs", () => {
  const source = "Beautiful presentation materials should feel intentional and quietly memorable";
  const result = scrambleText(source, { random: seededRandom(7) });
  const words = result.toLowerCase().match(/[a-z]+/g) ?? [];

  assert.ok(words.every((word) => !/[aeiou]{3}/.test(word)));
  assert.ok(words.every((word) => !/[^aeiou]{3}/.test(word)));
});

test("avoids repetitive machine-like word patterns", () => {
  const source = "Memorable editorial typography deserves a graceful temporary language";

  for (let seed = 1; seed <= 50; seed++) {
    const words =
      scrambleText(source, { random: seededRandom(seed) })
        .toLowerCase()
        .match(/[a-z]+/g) ?? [];
    assert.ok(words.every((word) => !/([a-z]{2})\1/.test(word)));
  }
});

test("avoids obvious short words and unwelcome fragments", () => {
  const source = "Ax bx cx dx ex fx gx hx ix jx kx lx mx nx ox px qx rx sx tx ux vx wx";
  const commonWords = new Set([
    "am",
    "an",
    "as",
    "at",
    "be",
    "by",
    "do",
    "go",
    "he",
    "if",
    "in",
    "is",
    "it",
    "me",
    "my",
    "no",
    "of",
    "on",
    "or",
    "so",
    "to",
    "up",
    "us",
    "we",
  ]);
  const unwelcomeFragments = [
    "anus",
    "ass",
    "cock",
    "cunt",
    "dick",
    "fuck",
    "hate",
    "kill",
    "nazi",
    "porn",
    "rape",
    "sex",
    "shit",
    "slut",
  ];

  for (let seed = 1; seed <= 50; seed++) {
    const words =
      scrambleText(source, { random: seededRandom(seed) })
        .toLowerCase()
        .match(/[a-z]+/g) ?? [];
    assert.ok(words.every((word) => !commonWords.has(word)));
    assert.ok(words.every((word) => unwelcomeFragments.every((fragment) => !word.includes(fragment))));
  }
});
