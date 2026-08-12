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

test("preserves layout, punctuation, and line breaks", () => {
  const source = "A quiet title\n\nDesign\twith soul — always.\nhello@example.com · 2026 ✦";
  const result = scrambleText(source, { random: seededRandom(1) });

  assert.equal(structure(result), structure(source));
  assert.deepEqual(separators(result), separators(source));
  assert.notEqual(result, source);
});

test("preserves casing and repeated-word consistency", () => {
  const result = scrambleText("Shape shape SHAPE", { random: seededRandom(3) });
  const words = result.split(" ");

  assert.equal(words[0].toLowerCase(), words[1].toLowerCase());
  assert.equal(words[1].toLowerCase(), words[2].toLowerCase());
  assert.match(words[0], /^[A-Z][a-z]+$/);
  assert.match(words[2], /^[A-Z]+$/);
});

test("handles Unicode titlecase and canonically equivalent accents", () => {
  const result = scrambleText("ǅuro é e\u0301", { random: seededRandom(33) });
  const words = result.split(" ");

  assert.match(words[0], /^[A-Z][a-z]+$/);
  assert.equal(words[1].normalize("NFC"), words[2].normalize("NFC"));
  assert.equal(structure(result), structure("ǅuro é e\u0301"));
});

test("preserves decimal writing systems and leaves other numeric symbols intact", () => {
  const source = "2026 · ２０２６ · ٢٠٢٦ · २०२६ · 𝟚𝟘𝟚𝟞 · Ⅷ ½ ²";
  const result = scrambleText(source, { random: seededRandom(20) });

  assert.equal(structure(result), structure(source));
  assert.match(result, /^[0-9]+ · [０-９]+ · [٠-٩]+ · [०-९]+ · [𝟘-𝟡]+ · Ⅷ ½ ²$/u);
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

test("keeps estimated line measure close across varied output", () => {
  const source = "Stories deserve more than a template.";
  const sourceWidth = estimateVisualWidth(source);

  for (let seed = 1; seed <= 50; seed++) {
    const result = scrambleText(source, { random: seededRandom(seed) });
    const difference = Math.abs(estimateVisualWidth(result) - sourceWidth);

    assert.ok(difference / sourceWidth < 0.055);
  }
});

test("avoids harsh and machine-like word patterns", () => {
  const source = "Memorable editorial typography deserves graceful temporary language";

  for (let seed = 1; seed <= 50; seed++) {
    const words =
      scrambleText(source, { random: seededRandom(seed) })
        .toLowerCase()
        .match(/[a-z]+/g) ?? [];

    assert.ok(words.every((word) => !/[aeiou]{3}|[^aeiou]{3}|([a-z]{2})\1/.test(word)));
  }
});
