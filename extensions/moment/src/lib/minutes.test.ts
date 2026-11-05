import assert from "node:assert/strict";
import { test } from "node:test";
import { parseMinutes, toolMinutes } from "./minutes.ts";

for (const text of [undefined, "", "   "]) {
  test(`parseMinutes_${JSON.stringify(text)}_isNotGiven`, () => {
    assert.deepEqual(parseMinutes(text), { ok: true, minutes: undefined });
  });
}

for (const [text, minutes] of [
  [" 45 ", 45],
  ["1", 1],
  ["90", 90],
  ["007", 7],
] as const) {
  test(`parseMinutes_${JSON.stringify(text)}_is${minutes}`, () => {
    assert.deepEqual(parseMinutes(text), { ok: true, minutes });
  });
}

for (const text of ["0", "00", "-5", "+5", "4.5", "1e2", "abc", "45 minutes", "٤٥", "4 5"]) {
  test(`parseMinutes_${JSON.stringify(text)}_isRefusedAsNotWholeMinutes`, () => {
    assert.deepEqual(parseMinutes(text), { ok: false, title: "Moment takes whole minutes from 1 to 90." });
  });
}

for (const text of ["91", "120", "99999999999999999999"]) {
  test(`parseMinutes_${JSON.stringify(text)}_isRefusedWithSirisMaximumLine`, () => {
    assert.deepEqual(parseMinutes(text), { ok: false, title: "The timer can run for 90 minutes at most." });
  });
}

for (const value of [undefined, null]) {
  test(`toolMinutes_${String(value)}_isNotGiven`, () => {
    assert.deepEqual(toolMinutes(value), { ok: true, minutes: undefined });
  });
}

for (const [value, minutes] of [
  [45, 45],
  [1, 1],
  [90, 90],
  ["25", 25],
] as const) {
  test(`toolMinutes_${JSON.stringify(value)}_is${minutes}`, () => {
    assert.deepEqual(toolMinutes(value), { ok: true, minutes });
  });
}

for (const value of [0, -5, 45.5, Number.NaN, Number.POSITIVE_INFINITY, "ten", true, {}]) {
  test(`toolMinutes_${String(value)}_isRefusedAsNotWholeMinutes`, () => {
    assert.deepEqual(toolMinutes(value), { ok: false, title: "Moment takes whole minutes from 1 to 90." });
  });
}

test("toolMinutes_91_isRefusedWithSirisMaximumLine", () => {
  assert.deepEqual(toolMinutes(91), { ok: false, title: "The timer can run for 90 minutes at most." });
});
