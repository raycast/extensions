import { strict as assert } from "node:assert";
import test from "node:test";
import { getTagQueryPrefix } from "./tag-query";

test("getTagQueryPrefix leaves simple tags unquoted", () => {
  assert.equal(getTagQueryPrefix("design_system"), "tag:design_system");
});

test("getTagQueryPrefix quotes tags with spaces", () => {
  assert.equal(getTagQueryPrefix("design systems"), 'tag:"design systems"');
});

test("getTagQueryPrefix escapes embedded quotes", () => {
  assert.equal(getTagQueryPrefix('he said "hi"'), 'tag:"he said \\"hi\\""');
});
