import test from "node:test";
import assert from "node:assert/strict";
import { formatPaletteCssVariables, formatPaletteHexList, formatReference, parseReferenceText } from "./palette";

const references = [
  { number: "053", name: "蚌肉白", hex: "#F9F1DB" },
  { number: "098", name: "粉白", hex: "#FBF2E3" },
];

test("formats a palette reference for display", () => {
  assert.equal(formatReference(references[0]), "053 蚌肉白 #F9F1DB");
});

test("formats palette HEX lists for copying", () => {
  assert.equal(formatPaletteHexList(references), "#F9F1DB #FBF2E3");
});

test("formats palette CSS variables with readable names", () => {
  assert.equal(formatPaletteCssVariables("similar", references), "--similar-053: #F9F1DB;\n--similar-098: #FBF2E3;");
});

test("parses upstream reference text", () => {
  assert.deepEqual(parseReferenceText("053-蚌肉白 #F9F1DB | 098-粉白 #FBF2E3"), references);
});
