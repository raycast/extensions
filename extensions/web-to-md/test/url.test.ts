import test from "node:test";
import assert from "node:assert/strict";
import { looksLikeUrl, normalizeUrl } from "../src/lib/url";

test("looksLikeUrl detects http(s) URLs", () => {
  assert.equal(looksLikeUrl("https://example.com"), true);
  assert.equal(looksLikeUrl("http://example.com"), true);
  assert.equal(looksLikeUrl("example.com"), false);
  assert.equal(looksLikeUrl(""), false);
});

test("normalizeUrl adds https:// when missing", () => {
  assert.equal(normalizeUrl("example.com"), "https://example.com/");
});

test("normalizeUrl rejects non-http(s)", () => {
  assert.throws(() => normalizeUrl("ftp://example.com"), /http/);
});

test("normalizeUrl rejects empty input", () => {
  assert.throws(() => normalizeUrl("   "), /enter a URL/i);
});

