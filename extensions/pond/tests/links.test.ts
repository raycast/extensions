import assert from "node:assert/strict";
import { test } from "node:test";
import { folderLink, hostname, isWebUrl, markdownLink, saveLink, searchLink, tagSearchLink } from "../src/lib/links";
import { cleanTags, parseTags, parseWebUrl, webUrl } from "../src/lib/urls";

test("deep links encode their IDs", () => {
  assert.equal(saveLink({ id: "a/b", libraryId: "lib 1" }), "pond://item/a%2Fb?library=lib+1");
  assert.equal(saveLink({ id: "a" }), "pond://item/a");
  assert.equal(folderLink("f 1"), "pond://folder/f%201");
  assert.equal(searchLink("calm ui"), "pond://search?q=calm%20ui");
});

test("tag searches quote the tag and strip quotes inside it", () => {
  assert.equal(tagSearchLink('say "hi"'), `pond://search?q=${encodeURIComponent('tags:"say hi"')}`);
});

test("web URL helpers", () => {
  assert.equal(isWebUrl("https://example.com"), true);
  assert.equal(isWebUrl("file:///etc/hosts"), false);
  assert.equal(hostname("https://www.example.com/path"), "example.com");
  assert.equal(hostname("not a url"), "not a url");
  assert.equal(markdownLink("[a]", "https://e.com/(x)"), "[\\[a\\]](https://e.com/(x%29)");
});

test("parseWebUrl accepts only http and https", () => {
  assert.equal(parseWebUrl(" https://example.com "), "https://example.com/");
  assert.equal(parseWebUrl("javascript:alert(1)"), null);
  assert.equal(parseWebUrl("two words"), null);
  assert.equal(parseWebUrl(undefined), null);
  assert.throws(() => webUrl("example.com"), /http:\/\/ or https:\/\//);
});

test("tags are trimmed, unhashed, and deduped without case", () => {
  assert.deepEqual(parseTags(" #Design, design,ui ,, "), ["Design", "ui"]);
  assert.deepEqual(parseTags(undefined), []);
  assert.throws(() => cleanTags(Array.from({ length: 101 }, (_, index) => `t${index}`)), /100 tags/);
});
