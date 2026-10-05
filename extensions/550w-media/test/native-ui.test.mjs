import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("uncertain paid submissions retain operation ID without offering API Key receipt lookup", () => {
  const source = readFileSync(new URL("../src/media.tsx", import.meta.url), "utf8");
  assert.match(source, /operation=\{values.operationId\}/);
  assert.match(source, /uncertain/);
  assert.match(source, /operation && auth.mode === "oauth"/);
  assert.match(source, /API Key API has no operation receipt lookup/);
});

test("native result containers do not contain explicit whitespace text children", () => {
  const source = readFileSync(new URL("../src/media.tsx", import.meta.url), "utf8");
  for (const container of source.matchAll(
    /<(ActionPanel|Detail\.Metadata)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g,
  )) {
    assert.doesNotMatch(container[0], /\{\s*["']\s+["']\s*\}/);
  }
});
