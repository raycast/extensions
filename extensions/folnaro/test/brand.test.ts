import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND_ACCENT, PALETTE, STATUS_PRIMITIVE } from "../src/lib/brand";

// In the Folnaro repository the token file sits next door; in the Raycast extensions
// repository it does not, and this check is skipped.
const tokensPath = join(__dirname, "..", "..", "..", "docs", "brand", "tokens.json");

describe.skipIf(!existsSync(tokensPath))("Brand colors", () => {
  const tokens = JSON.parse(readFileSync(tokensPath, "utf8"));
  it("match docs/brand/tokens.json", () => {
    expect(BRAND_ACCENT).toEqual({ light: tokens.primitives.brandAccent.light, dark: tokens.primitives.brandAccent.dark });
    for (const [name, color] of Object.entries(PALETTE)) {
      expect(color, name).toEqual({ light: tokens.primitives[name].light, dark: tokens.primitives[name].dark });
    }
    for (const [tone, primitive] of Object.entries(STATUS_PRIMITIVE)) {
      const alias = "status" + tone[0].toUpperCase() + tone.slice(1);
      expect(primitive, alias).toBe(tokens.aliases[alias]);
    }
  });
});
