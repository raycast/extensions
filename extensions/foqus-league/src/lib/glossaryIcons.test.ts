import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const RENDERS = /^(?:\p{Emoji_Presentation}|\p{Emoji}️)+$/u;

test("every glossary icon is an emoji Raycast will draw", () => {
  const source = readFileSync("src/lib/HowItWorks.tsx", "utf8");
  const glyphs = [...source.matchAll(/icon: "([^"]+)"/g)].map((m) => m[1]);

  assert.ok(glyphs.length >= 7, "no icons found, the match pattern has drifted");
  for (const glyph of glyphs) {
    const codes = [...glyph].map((c) => c.codePointAt(0)?.toString(16)).join(" ");
    assert.ok(RENDERS.test(glyph), `${glyph} (U+${codes}) will not render`);
  }
});
