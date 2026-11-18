import { strict as assert } from "node:assert";
import test from "node:test";
import {
  getSpaceColorName,
  pickSpaceColor,
  resolveSpaceColor,
  SPACE_COLOR_NAMES,
  SPACE_COLOR_OPTIONS,
} from "./space-colors";

test("resolveSpaceColor resolves palette names case-insensitively", () => {
  assert.equal(resolveSpaceColor("Teal"), "#06d6a0");
  assert.equal(resolveSpaceColor("teal"), "#06d6a0");
  assert.equal(resolveSpaceColor("  BLACK  "), "#000");
});

test("resolveSpaceColor resolves palette hex values", () => {
  assert.equal(resolveSpaceColor("#06D6A0"), "#06d6a0");
  assert.equal(resolveSpaceColor("#166ff4"), "#166ff4");
});

test("resolveSpaceColor returns undefined for empty and unsupported input", () => {
  assert.equal(resolveSpaceColor(undefined), undefined);
  assert.equal(resolveSpaceColor("   "), undefined);
  assert.equal(resolveSpaceColor("#123456"), undefined);
  assert.equal(resolveSpaceColor("chartreuse"), undefined);
});

test("getSpaceColorName maps palette hex values back to names", () => {
  assert.equal(getSpaceColorName("#06d6a0"), "Teal");
  assert.equal(getSpaceColorName("#000"), "Black");
  assert.equal(getSpaceColorName(undefined), undefined);
  assert.equal(getSpaceColorName("#123456"), undefined);
});

test("pickSpaceColor always returns a valid palette hex", () => {
  const paletteValues = new Set<string>(SPACE_COLOR_OPTIONS.map((option) => option.value));

  assert.ok(paletteValues.has(pickSpaceColor("Reading List")));
  assert.ok(paletteValues.has(pickSpaceColor()));
  assert.ok(paletteValues.has(pickSpaceColor("   ")));
});

test("pickSpaceColor is deterministic for the same seed", () => {
  assert.equal(pickSpaceColor("Reading List"), pickSpaceColor("Reading List"));
  assert.equal(pickSpaceColor("  Reading List  "), pickSpaceColor("Reading List"));
});

test("SPACE_COLOR_NAMES matches the palette options", () => {
  assert.equal(SPACE_COLOR_NAMES.length, SPACE_COLOR_OPTIONS.length);
  assert.deepEqual(
    SPACE_COLOR_NAMES,
    SPACE_COLOR_OPTIONS.map((option) => option.title),
  );
});
