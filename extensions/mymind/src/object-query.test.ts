import { strict as assert } from "node:assert";
import test from "node:test";
import { buildObjectQuery } from "./object-query";

test("buildObjectQuery combines type filter and search text", () => {
  assert.equal(buildObjectQuery("design systems", "image"), "type:image && design systems");
});

test("buildObjectQuery omits empty parts", () => {
  assert.equal(buildObjectQuery("", "all"), undefined);
  assert.equal(buildObjectQuery("notes", "all"), "notes");
  assert.equal(buildObjectQuery("", "pdf"), "type:pdf");
});

test("buildObjectQuery prepends a prefix when provided", () => {
  assert.equal(buildObjectQuery("sunset", "all", "space:design"), "space:design && sunset");
});

test("buildObjectQuery preserves advanced mymind syntax", () => {
  assert.equal(
    buildObjectQuery('tag:design && site:vercel.com || "voice agents"', "all"),
    'tag:design && site:vercel.com || "voice agents"',
  );
});
