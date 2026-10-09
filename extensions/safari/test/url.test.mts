// Run with: node --test test/url.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseWebUrl } from "../src/url.ts";

const accepted: [string, string][] = [
  ["raycast.com", "https://raycast.com/"],
  ["https://www.raycast.com/blog", "https://www.raycast.com/blog"],
  ["example.com:8080", "https://example.com:8080/"],
  ["example.com:8080/path?q=1", "https://example.com:8080/path?q=1"],
  ["localhost", "http://localhost/"],
  ["localhost:3000", "http://localhost:3000/"],
  ["app.localhost:5173/x", "http://app.localhost:5173/x"],
  ["127.0.0.1:8000", "http://127.0.0.1:8000/"],
  ["[::1]:3000", "http://[::1]:3000/"],
  ["http://[::1]:3000", "http://[::1]:3000/"],
  ["http://intranet/", "http://intranet/"],
  ["intranet:8080", "https://intranet:8080/"],
  ["  HTTPS://Example.com  ", "https://example.com/"],
];

for (const [input, expected] of accepted) {
  test(`accepts ${JSON.stringify(input)}`, () => {
    assert.equal(parseWebUrl(input).href, expected);
  });
}

const rejected = [
  "ftp://files.example.com/readme.txt",
  "javascript:alert(1)",
  "mailto:hi@example.com",
  "file:///etc/hosts",
  "htps//raycast.com",
  "intranet",
  "http://",
  "",
];

for (const input of rejected) {
  test(`rejects ${JSON.stringify(input)}`, () => {
    assert.throws(() => parseWebUrl(input));
  });
}
