import assert from "node:assert/strict";
import test from "node:test";
import type { Application } from "@raycast/api";
import { detectCorrection } from "./detection";
import { convertToEnglish, getLayout } from "./layout";

const applications: Application[] = [
  { name: "Cursor", path: "/Applications/Cursor.app", bundleId: "com.todesktop.230313mzl4w4u92" },
  { name: "YouTube", path: "/Applications/YouTube.app", bundleId: "com.google.youtube" },
  { name: "Google Chrome", path: "/Applications/Google Chrome.app", bundleId: "com.google.Chrome" },
  { name: "Zoom", path: "/Applications/zoom.us.app", bundleId: "us.zoom.xos" },
];

test("converts supported layouts to the physical US English keys", () => {
  assert.equal(convertToEnglish("сгкыщк", getLayout("russian")).text, "cursor");
  assert.equal(convertToEnglish("ї", getLayout("ukrainian")).text, "]");
  assert.equal(convertToEnglish("chro,e", getLayout("french")).text, "chrome");
  assert.equal(convertToEnglish("zoutube", getLayout("german")).text, "youtube");
  assert.equal(convertToEnglish("ζοομ", getLayout("greek")).text, "zoom");
  assert.equal(convertToEnglish("άέήίόύώ", getLayout("greek")).text, "aehioyv");
  assert.equal(convertToEnglish("ΆΈΉΊΌΎΏ", getLayout("greek")).text, "AEHIOYV");
  assert.equal(convertToEnglish("α\u0301", getLayout("greek")).text, "a");
});

test("automatically detects non-Latin layouts", () => {
  const correction = detectCorrection("сгкыщк", applications, "auto");
  assert.equal(correction.query, "cursor");
  assert.equal(correction.applications[0]?.application.name, "Cursor");
});

test("automatically converts precomposed Greek accents", () => {
  const correction = detectCorrection("ζόομ", applications, "auto");
  assert.equal(correction.query, "zoom");
  assert.equal(correction.layout?.id, "greek");
  assert.equal(correction.applications[0]?.application.name, "Zoom");
});

test("automatically detects a Latin layout from a strong application match", () => {
  const correction = detectCorrection("zoutube", applications, "auto");
  assert.equal(correction.query, "youtube");
  assert.equal(correction.layout?.id, "german");
});

test("keeps ambiguous web queries unchanged in automatic mode", () => {
  const correction = detectCorrection("ordinary web query", [], "auto");
  assert.equal(correction.query, "ordinary web query");
  assert.equal(correction.layout, undefined);
});

test("honors a manually selected layout", () => {
  const correction = detectCorrection("chro,e", applications, "french");
  assert.equal(correction.query, "chrome");
  assert.equal(correction.layout?.id, "french");
});
