import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkHslMatch } from "./matching.ts";

describe("hsl regex", () => {
  describe("comma-separated", () => {
    it("matches hsl with % signs", () => {
      const hslMatchGroups = checkHslMatch("hsl(120, 50%, 75%)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { h, s, l, alpha } = hslMatchGroups!;
      assert.equal(h, "120");
      assert.equal(s, "50");
      assert.equal(l, "75");
      assert.equal(alpha, undefined);
    });

    it("matches hsl without % signs", () => {
      const hslMatchGroups = checkHslMatch("hsl(120, 50, 75)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { h, s, l } = hslMatchGroups!;
      assert.equal(h, "120");
      assert.equal(s, "50");
      assert.equal(l, "75");
    });

    it("matches hsla with decimal alpha", () => {
      const hslMatchGroups = checkHslMatch("hsla(120, 50%, 75%, 0.5)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { h, s, l, alpha } = hslMatchGroups!;
      assert.equal(h, "120");
      assert.equal(s, "50");
      assert.equal(l, "75");
      assert.equal(alpha, "0.5");
    });

    it("matches hsla with integer alpha", () => {
      const hslMatchGroups = checkHslMatch("hsla(120, 50%, 75%, 1)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { alpha } = hslMatchGroups!;
      assert.equal(alpha, "1");
    });

    it("matches hsla with leading-dot alpha (.5)", () => {
      const hslMatchGroups = checkHslMatch("hsla(120, 50%, 75%, .5)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { alpha } = hslMatchGroups!;
      assert.equal(alpha, ".5");
    });
  });

  describe("space-separated", () => {
    it("matches hsl with % signs", () => {
      const hslMatchGroups = checkHslMatch("hsl(120 50% 75%)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { h, s, l, alpha } = hslMatchGroups!;
      assert.equal(h, "120");
      assert.equal(s, "50");
      assert.equal(l, "75");
      assert.equal(alpha, undefined);
    });

    it("matches hsl without % signs", () => {
      const hslMatchGroups = checkHslMatch("hsl(120 50 75)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { h, s, l } = hslMatchGroups!;
      assert.equal(h, "120");
      assert.equal(s, "50");
      assert.equal(l, "75");
    });

    it("matches hsl with slash alpha as number (modern CSS syntax)", () => {
      const hslMatchGroups = checkHslMatch("hsl(120 50% 75% / 0.5)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { h, s, l, alpha } = hslMatchGroups!;
      assert.equal(h, "120");
      assert.equal(s, "50");
      assert.equal(l, "75");
      assert.equal(alpha, "0.5");
    });

    it("matches hsl with slash alpha as percentage (modern CSS syntax)", () => {
      const hslMatchGroups = checkHslMatch("hsl(120 50% 75% / 50%)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { h, s, l, alpha } = hslMatchGroups!;
      assert.equal(h, "120");
      assert.equal(s, "50");
      assert.equal(l, "75");
      assert.equal(alpha, "50%");
    });

    it("matches hsl with slash alpha as integer (no percent)", () => {
      const hslMatchGroups = checkHslMatch("hsl(10 10% 10% / 0.1)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { h, s, l, alpha } = hslMatchGroups!;
      assert.equal(h, "10");
      assert.equal(s, "10");
      assert.equal(l, "10");
      assert.equal(alpha, "0.1");
    });

    it("matches hsl with slash alpha as integer percentage", () => {
      const hslMatchGroups = checkHslMatch("hsl(10 10% 10% / 10%)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { h, s, l, alpha } = hslMatchGroups!;
      assert.equal(h, "10");
      assert.equal(s, "10");
      assert.equal(l, "10");
      assert.equal(alpha, "10%");
    });

    it("matches hsla with comma alpha", () => {
      const hslMatchGroups = checkHslMatch("hsla(120 50% 75%, 0.3)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { alpha } = hslMatchGroups!;
      assert.equal(alpha, "0.3");
    });
  });

  describe("case insensitivity", () => {
    it("matches uppercase HSL", () => {
      assert.notEqual(checkHslMatch("HSL(120, 50%, 75%)"), null);
    });

    it("matches uppercase HSLA", () => {
      assert.notEqual(checkHslMatch("HSLA(120, 50%, 75%, 0.5)"), null);
    });
  });

  describe("whitespace tolerance", () => {
    it("matches with extra spaces inside parens", () => {
      const hslMatchGroups = checkHslMatch("hsl(  120,  50%,  75%  )");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { h, s, l } = hslMatchGroups!;
      assert.equal(h, "120");
      assert.equal(s, "50");
      assert.equal(l, "75");
    });

    it("matches with no spaces", () => {
      const hslMatchGroups = checkHslMatch("hsl(120,50%,75%)");
      assert.notEqual(hslMatchGroups, null, "Failed to find hsl match");
      const { h, s, l } = hslMatchGroups!;
      assert.equal(h, "120");
      assert.equal(s, "50");
      assert.equal(l, "75");
    });
  });

  describe("non-matches", () => {
    it("does not match rgb()", () => {
      assert.equal(checkHslMatch("rgb(120, 50, 75)"), null);
    });

    it("does not match empty hsl()", () => {
      assert.equal(checkHslMatch("hsl()"), null);
    });

    it("does not match hsl with missing lightness", () => {
      assert.equal(checkHslMatch("hsl(120, 50%)"), null);
    });

    it("does not match bare number", () => {
      assert.equal(checkHslMatch("120"), null);
    });
  });
});
