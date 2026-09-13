import test from "node:test";
import assert from "node:assert/strict";
import { looksLikeUrl, normalizeUrl, tryNormalizeUrl } from "../src/lib/url";

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

test("tryNormalizeUrl accepts scheme-less input a user typed on purpose", () => {
  assert.equal(tryNormalizeUrl("example.com"), "https://example.com/");
  assert.equal(tryNormalizeUrl("  example.com/blog/post  "), "https://example.com/blog/post");
  assert.equal(tryNormalizeUrl("https://example.com/post"), "https://example.com/post");
});

test("tryNormalizeUrl returns null instead of throwing on junk", () => {
  assert.equal(tryNormalizeUrl(""), null);
  assert.equal(tryNormalizeUrl("   "), null);
  assert.equal(tryNormalizeUrl(undefined), null);
  assert.equal(tryNormalizeUrl("ftp://example.com"), null);
  assert.equal(tryNormalizeUrl("just some prose, not a url"), null);
});

test("tryNormalizeUrl rejects scheme-less input with no plausible host", () => {
  // Without these guards new URL() happily invents a host: "hello" becomes
  // https://hello/ and the numeric forms become IPv4 shorthand.
  assert.equal(tryNormalizeUrl("hello"), null);
  assert.equal(tryNormalizeUrl("notes"), null);
  assert.equal(tryNormalizeUrl("3.5"), null);
  assert.equal(tryNormalizeUrl("0"), null);
  assert.equal(tryNormalizeUrl("2130706433"), null);
  assert.equal(tryNormalizeUrl("0x7f000001"), null);
  assert.equal(tryNormalizeUrl(".."), null);
});

test("tryNormalizeUrl still accepts the hosts that matter", () => {
  assert.equal(tryNormalizeUrl("localhost:3000"), "https://localhost:3000/");
  assert.equal(tryNormalizeUrl("127.0.0.1:8080"), "https://127.0.0.1:8080/");
  assert.equal(tryNormalizeUrl("http://intranet-box/wiki"), "http://intranet-box/wiki");
  assert.equal(tryNormalizeUrl("münchen.de"), "https://xn--mnchen-3ya.de/");
});
