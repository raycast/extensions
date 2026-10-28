import test from "node:test";
import assert from "node:assert/strict";
import { getInitialIconDataUri, initialOf } from "./avatar";

function decode(dataUri: string): string {
  const prefix = "data:image/svg+xml;base64,";
  assert.ok(dataUri.startsWith(prefix));
  return Buffer.from(dataUri.slice(prefix.length), "base64").toString("utf8");
}

test("uses the first letter or digit of the title", () => {
  assert.equal(initialOf("example.com"), "E");
  assert.equal(initialOf("  42 Things"), "4");
  assert.equal(initialOf("été"), "É");
  assert.equal(initialOf("(Work) Acme"), "W");
  assert.equal(initialOf("!!!"), "?");
});

test("builds a standalone SVG with the initial", () => {
  const svg = decode(getInitialIconDataUri("Acme Corp"));
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg, />A<\/text><\/svg>$/);
  assert.match(svg, /fill="#[0-9A-F]{6}"/);
});

test("picks the same color for the same title, case-insensitively", () => {
  assert.equal(getInitialIconDataUri("Acme"), getInitialIconDataUri("acme"));
});
