import assert from "node:assert/strict";
import { test } from "node:test";
import { selectPreview, updateCountInput, type CountInput, type GeneratedUnit } from "../src/generator.ts";
import { textStatistics } from "../src/text-statistics.ts";

test("counts empty, whitespace, and punctuation without inventing words", () => {
  assert.deepEqual(textStatistics(""), { characters: 0, words: 0 });
  assert.deepEqual(textStatistics("\t \n"), { characters: 3, words: 0 });
  assert.deepEqual(textStatistics("— ¡¿! —"), { characters: 7, words: 0 });
});

test("recognizes Spanish words across punctuation and Unicode spaces", () => {
  assert.deepEqual(textStatistics("Hola—mundo"), { characters: 10, words: 2 });
  assert.deepEqual(textStatistics("¡Hola!¿Cómo estás?"), { characters: 18, words: 3 });
  assert.deepEqual(textStatistics("uno\u00a0dos"), { characters: 7, words: 2 });
  assert.deepEqual(textStatistics("uno\u200bdos"), { characters: 7, words: 2 });
});

test("counts graphemes for accents, surrogate pairs, emoji sequences, and flags", () => {
  assert.deepEqual(textStatistics("café cafe\u0301"), { characters: 9, words: 2 });
  assert.deepEqual(textStatistics("😀"), { characters: 1, words: 0 });
  assert.deepEqual(textStatistics("👩🏽‍💻 🇨🇱"), { characters: 3, words: 0 });
});

test("includes paragraph separators and treats CRLF as one grapheme", () => {
  assert.deepEqual(textStatistics("uno\n\ndos"), { characters: 8, words: 2 });
  assert.deepEqual(textStatistics("uno\r\n\r\ndos"), { characters: 8, words: 2 });
});

test("statistics follow the exact formatted preview and retained pool prefixes", () => {
  for (const unit of ["passages", "sentences"] as const) {
    const pool: GeneratedUnit[] = Array.from({ length: unit === "passages" ? 10 : 20 }, (_, index) => ({
      id: index + 1,
      text: ["  ¡Hola!  ", "¿Qué tal?", "café."][index] ?? "Texto oculto.",
      section_id: 1,
      book_id: "sub-terra",
      sentence_separator: " ",
      snapshot_sha256: "hash",
      title: "Attribution is excluded from statistics",
      edition: "1904",
      source_url: "https://example.com/story",
      revision_url: "https://example.com/revision",
    }));
    let state: CountInput = { input: "1", request: { unit, count: 1 } };
    const initial = selectPreview(state.request, pool);
    assert.equal(initial.text, "¡Hola!");
    assert.deepEqual(textStatistics(initial.text), { characters: 6, words: 1 });

    state = updateCountInput(state, "2");
    const expanded = selectPreview(state.request, pool);
    assert.equal(expanded.text, unit === "passages" ? "¡Hola!\n\n¿Qué tal?" : "¡Hola! ¿Qué tal?");
    assert.deepEqual(textStatistics(expanded.text), { characters: unit === "passages" ? 17 : 16, words: 3 });

    state = updateCountInput(state, "invalid");
    assert.ok(state.error);
    assert.deepEqual(textStatistics(selectPreview(state.request, pool).text), textStatistics(expanded.text));

    state = updateCountInput(state, "1");
    assert.deepEqual(textStatistics(selectPreview(state.request, pool).text), { characters: 6, words: 1 });
    state = updateCountInput(state, "3");
    assert.deepEqual(textStatistics(selectPreview(state.request, pool).text), {
      characters: unit === "passages" ? 24 : 22,
      words: 4,
    });

    const regenerated = pool.map((row) => ({ ...row, text: "Otro texto." }));
    assert.deepEqual(textStatistics(selectPreview(state.request, regenerated).text), {
      characters: unit === "passages" ? 37 : 35,
      words: 6,
    });
  }
});

test("uses the book locale with Unicode word and grapheme boundaries", () => {
  for (const [locale, text] of [
    ["zh", "春眠不覺曉。"],
    ["ja", "私は猫です。"],
    ["ar", "هذه أجنحة متكسرة."],
    ["hi", "गोदान प्रेमचंद"],
    ["ko", "진달래꽃"],
    ["ru", "Преступление и наказание"],
  ]) {
    const characters = [...new Intl.Segmenter(locale, { granularity: "grapheme" }).segment(text)].length;
    const words = [...new Intl.Segmenter(locale, { granularity: "word" }).segment(text)].filter(
      (part) => part.isWordLike,
    ).length;
    assert.deepEqual(textStatistics(text, locale), { characters, words });
  }
  assert.deepEqual(textStatistics("Latin words.", "la"), textStatistics("Latin words.", "en"));
  assert.deepEqual(textStatistics("Latin words.", "not_a_locale"), textStatistics("Latin words.", "en"));
});
