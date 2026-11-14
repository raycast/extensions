import assert from "node:assert/strict";
import test from "node:test";

import { displayHost, markdownLink } from "../src/lib/presentation";

test("removes www from display hosts", () => {
  assert.equal(displayHost("https://www.raycast.com/store"), "raycast.com");
});

test("falls back to the original string for invalid URLs", () => {
  assert.equal(displayHost("not a URL"), "not a URL");
});

test("formats Markdown links", () => {
  assert.equal(markdownLink("Raycast", "https://raycast.com"), "[Raycast](https://raycast.com)");
});

test("escapes closing brackets in Markdown titles", () => {
  assert.equal(markdownLink("Ray[cast]", "https://raycast.com"), "[Ray\\[cast\\]](https://raycast.com)");
});
