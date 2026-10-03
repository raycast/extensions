import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("native result containers do not contain explicit whitespace text children", () => {
  const source = readFileSync(new URL("../src/media.tsx", import.meta.url), "utf8");
  for (const container of source.matchAll(
    /<(ActionPanel|Detail\.Metadata)(?:\s[^>]*)?>[\s\S]*?<\/\1>/g,
  )) {
    assert.doesNotMatch(container[0], /\{\s*["']\s+["']\s*\}/);
  }
});
