import { describe, expect, it } from "vitest";
import { detectDeterministic } from "./deterministic";
import { IDENTIFIER_CASES } from "./identifiers.fixture";

/** Technical identifiers must survive masking: they are what makes a masked
 * ticket still usable for debugging and database queries. */
function masked(text: string): string[] {
  return detectDeterministic(text).map((s) => text.slice(s.start, s.end));
}

const CASES = IDENTIFIER_CASES;

describe("technical identifiers pass through", () => {
  for (const [name, text] of CASES) {
    it(`leaves a ${name} alone`, () => {
      expect(masked(text)).toEqual([]);
    });
  }
});
