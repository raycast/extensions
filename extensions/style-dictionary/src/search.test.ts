import assert from "node:assert/strict";
import { test } from "node:test";
import { tokenMatcher } from "./search.ts";

const oklch = { path: ["color", "brand", "500"], value: "oklch(49.93% 0.0987 250.43)", kind: "color" as const };
const spacing = { path: ["spacing", "m"], value: "8px", kind: "dimension" as const };

test("finds a color by another format", () => {
  for (const q of ["#336699", "336699", "#369", "rgb(51, 102, 153)", "rgb(51 102 153)", "hsl(210"]) {
    assert.ok(tokenMatcher(q)(oklch), q);
  }
  assert.ok(!tokenMatcher("#336698")(oklch));
});

test("still matches path, value, and multiple terms", () => {
  assert.ok(tokenMatcher("brand 500")(oklch));
  assert.ok(tokenMatcher("8px")(spacing));
  assert.ok(!tokenMatcher("brand 8px")(oklch));
});
