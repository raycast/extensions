import test from "node:test";
import assert from "node:assert/strict";
import { canonicalUrl, lookupKey } from "../src/helpers/duplicates";

test("the same document keeps one identity across scheme, www, slash, anchor and campaign tags", () => {
  const base = canonicalUrl("https://example.com/page");
  assert.equal(base, "//example.com/page");
  for (const value of [
    "http://example.com/page",
    "https://www.example.com/page",
    "https://example.com/page/",
    "https://example.com/page//",
    "https://example.com/page?utm_source=newsletter&utm_medium=email",
    "https://example.com/page#section-2",
    "https://EXAMPLE.com/page",
  ])
    assert.equal(canonicalUrl(value), base, value);
});

test("query parameters are ordered and campaign parameters dropped", () => {
  assert.equal(canonicalUrl("https://example.com/a?b=1&a=2"), "//example.com/a?a=2&b=1");
  assert.equal(
    canonicalUrl("https://example.com/a?utm_source=x&b=1&a=2"),
    canonicalUrl("https://example.com/a?a=2&b=1"),
  );
  assert.notEqual(canonicalUrl("https://example.com/a?id=1"), canonicalUrl("https://example.com/a?id=2"));
});

test("different documents stay different", () => {
  for (const [left, right] of [
    ["https://example.com/a", "https://example.com/b"],
    ["https://example.com/a", "https://example.com/a/b"],
    ["https://example.com/a#/one", "https://example.com/a#/two"],
    ["https://example.com/a#!one", "https://example.com/a#!two"],
    ["https://example.com:8443/a", "https://example.com/a"],
    ["https://a.example.com/x", "https://b.example.com/x"],
  ])
    assert.notEqual(canonicalUrl(left), canonicalUrl(right), `${left} vs ${right}`);
});

test("only web pages get an identity", () => {
  for (const value of [
    "mailto:someone@example.com",
    "javascript:alert(1)",
    "file:///tmp/a",
    "example.com/a",
    "",
  ])
    assert.equal(canonicalUrl(value), null, value);
});

test("the form key ignores input that does not change the document", () => {
  const typed = lookupKey(["https://www.example.com/page/?utm_source=1#section"]);
  assert.ok(typed);
  assert.equal(typed.key, JSON.stringify(["//example.com/page"]));
  assert.deepEqual(typed.links, ["https://www.example.com/page/?utm_source=1#section"]);
  // Re-typing a slash, a www or a campaign parameter must not re-run the check.
  assert.equal(lookupKey(["http://example.com/page"])?.key, typed.key);
  assert.equal(lookupKey(["https://example.com/page#other"])?.key, typed.key);
});

test("an unfinished or unsupported link is not looked up", () => {
  for (const value of ["", "exa", "goo", "https://exa", "mailto:someone@example.com", "https://"])
    assert.equal(lookupKey([value]), null, value);
  // A real host is looked up even before the path is typed.
  assert.equal(lookupKey(["example.com"])?.key, JSON.stringify(["//example.com"]));
});

test("a batch keys on every document it names", () => {
  const batch = lookupKey(["https://example.com/a", "https://example.org/b"]);
  assert.ok(batch);
  assert.equal(batch.links.length, 2);
  assert.equal(batch.key, JSON.stringify(["//example.com/a", "//example.org/b"]));
});

test("encoded paths and IDN hosts broaden candidates without changing identity", () => {
  assert.equal(
    canonicalUrl("https://example.org/中文"),
    canonicalUrl("https://example.org/%E4%B8%AD%E6%96%87"),
  );
});

test("encoded query delimiters never collapse parameter boundaries", () => {
 for (const [left, right] of [["?a=1%26b%3D2", "?a=1&b=2"], ["?a%3Db=c", "?a=b%3Dc"], ["?a=%23x", "?a=#x"]])
 assert.notEqual(canonicalUrl("https://example.org/"+left), canonicalUrl("https://example.org/"+right));
});
