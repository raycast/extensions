import assert from "node:assert/strict";
import test from "node:test";

import { formatNumber, parseNumber } from "../src/number-format.ts";

test("parses plain integers and signs", () => {
  assert.deepEqual(parseNumber("0", "en-US"), { ok: true, value: 0 });
  assert.deepEqual(parseNumber("12", "en-US"), { ok: true, value: 12 });
  assert.deepEqual(parseNumber("1200000", "en-US"), { ok: true, value: 1_200_000 });
  assert.deepEqual(parseNumber("-42", "en-US"), { ok: true, value: -42 });
});

test("parses locale decimals", () => {
  assert.deepEqual(parseNumber("12.5", "en-US"), { ok: true, value: 12.5 });
  assert.deepEqual(parseNumber("12,5", "de-DE"), { ok: true, value: 12.5 });
  assert.deepEqual(parseNumber("0.00012", "en-US"), { ok: true, value: 0.00012 });
});

test("parses scientific notation", () => {
  assert.deepEqual(parseNumber("1.2e6", "en-US"), { ok: true, value: 1_200_000 });
  assert.deepEqual(parseNumber("-4.5E-7", "en-US"), { ok: true, value: -4.5e-7 });
});

test("parses common grouping separators", () => {
  for (const input of [
    "1,200,000",
    "1.200.000",
    "1 200 000",
    "1\u00a0200\u00a0000",
    "1\u202f200\u202f000",
    "1'200'000",
    "1’200’000",
  ]) {
    assert.deepEqual(parseNumber(input, input.includes(".") ? "de-DE" : "en-US"), {
      ok: true,
      value: 1_200_000,
    });
  }
});

test("uses the rightmost comma or period as the decimal separator when both occur", () => {
  assert.deepEqual(parseNumber("1,200.50", "en-US"), { ok: true, value: 1_200.5 });
  assert.deepEqual(parseNumber("1.200,50", "de-DE"), { ok: true, value: 1_200.5 });
});

test("uses locale and grouping shape to resolve a single separator", () => {
  assert.deepEqual(parseNumber("1,200", "en-US"), { ok: true, value: 1_200 });
  assert.deepEqual(parseNumber("1,2", "en-US"), { ok: true, value: 1.2 });
  assert.deepEqual(parseNumber("1.200", "de-DE"), { ok: true, value: 1_200 });
  assert.deepEqual(parseNumber("1,200", "de-DE"), { ok: true, value: 1.2 });
  assert.deepEqual(parseNumber("1.200", "de-CH"), { ok: true, value: 1.2 });
});

test("rejects malformed grouping before removing separators", () => {
  for (const [input, locale] of [
    ["1,,000", "en-US"],
    ["1,00,000", "en-US"],
    ["1.200.00", "de-DE"],
    ["1 20 000", "en-US"],
    ["1''000", "en-US"],
    ["1’’000", "en-US"],
    ["1,,200.50", "en-US"],
    ["1.20.200,50", "de-DE"],
    ["1,200'000.50", "en-US"],
  ]) {
    assert.deepEqual(parseNumber(input, locale), {
      ok: false,
      reason: "invalid",
    });
  }
});

test("rejects underflow without rejecting zero or representable subnormal values", () => {
  assert.deepEqual(parseNumber("1e-324", "en-US"), { ok: false, reason: "out-of-range" });
  assert.deepEqual(parseNumber("-1e-324", "en-US"), { ok: false, reason: "out-of-range" });
  assert.deepEqual(parseNumber("0e-999", "en-US"), { ok: true, value: 0 });
  assert.deepEqual(parseNumber("-0", "en-US"), { ok: true, value: -0 });
  assert.deepEqual(parseNumber("5e-324", "en-US"), { ok: true, value: 5e-324 });
});

test("rejects empty, malformed, out-of-range, and precision-unsafe values", () => {
  assert.deepEqual(parseNumber("   ", "en-US"), { ok: false, reason: "empty" });
  assert.deepEqual(parseNumber("12foo", "en-US"), { ok: false, reason: "invalid" });
  assert.deepEqual(parseNumber("1.2.3", "en-US"), { ok: false, reason: "invalid" });
  assert.deepEqual(parseNumber("1e309", "en-US"), { ok: false, reason: "out-of-range" });
  assert.deepEqual(parseNumber("1234567890123456", "en-US"), { ok: false, reason: "precision-loss" });
});

test("formats large English numbers in four fixed representations", () => {
  assert.deepEqual(formatNumber(1_200_000, "en-US", 2), [
    { kind: "grouped", label: "Grouped Number", value: "1,200,000" },
    { kind: "compact-short", label: "Compact Short", value: "1.2M" },
    { kind: "compact-long", label: "Compact Long", value: "1.2 million" },
    { kind: "scientific", label: "Scientific", value: "1.2E6" },
  ]);
});

test("uses a typographic apostrophe for Swiss grouping", () => {
  assert.equal(formatNumber(1_200_000, "de-CH", 2)[0]?.value, "1’200’000");
});

test("keeps small non-zero numbers visible", () => {
  const values = formatNumber(0.0000012, "en-US", 2).map((result) => result.value);

  assert.equal(values[0], "0.0000012");
  assert.equal(values[3], "1.2E-6");
  assert.ok(values.every((value) => value !== "0"));
});
