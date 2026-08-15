import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkHslMatch } from "./matching.ts";

function assertHslMatchValues(
  input: string,
  expected: { h: string; s: string; l: string; alpha?: string | undefined },
) {
  const groups = checkHslMatch(input);
  assert.notEqual(groups, null, "Failed to find hsl match");
  assert.equal(groups!.h, expected.h);
  assert.equal(groups!.s, expected.s);
  assert.equal(groups!.l, expected.l);
  if ("alpha" in expected) {
    assert.equal(groups!.alpha, expected.alpha);
  }
}

function assertHslAlphaMatch(input: string, expectedAlpha: string) {
  const groups = checkHslMatch(input);
  assert.notEqual(groups, null, "Failed to find hsl match");
  assert.equal(groups!.alpha, expectedAlpha);
}

describe("hsl regex", () => {
  describe("comma-separated", () => {
    it("matches hsl with % signs", () => {
      assertHslMatchValues("hsl(120, 50%, 75%)", { h: "120", s: "50", l: "75", alpha: undefined });
    });

    it("matches hsl without % signs", () => {
      assertHslMatchValues("hsl(120, 50, 75)", { h: "120", s: "50", l: "75" });
    });

    it("matches hsla with decimal alpha", () => {
      assertHslMatchValues("hsla(120, 50%, 75%, 0.5)", { h: "120", s: "50", l: "75", alpha: "0.5" });
    });

    it("matches hsla with integer alpha", () => {
      assertHslAlphaMatch("hsla(120, 50%, 75%, 1)", "1");
    });

    it("matches hsla with leading-dot alpha (.5)", () => {
      assertHslAlphaMatch("hsla(120, 50%, 75%, .5)", ".5");
    });
  });

  describe("space-separated", () => {
    it("matches hsl with % signs", () => {
      assertHslMatchValues("hsl(120 50% 75%)", { h: "120", s: "50", l: "75", alpha: undefined });
    });

    it("matches hsl without % signs", () => {
      assertHslMatchValues("hsl(120 50 75)", { h: "120", s: "50", l: "75" });
    });

    it("matches hsl with slash alpha as number (modern CSS syntax)", () => {
      assertHslMatchValues("hsl(120 50% 75% / 0.5)", { h: "120", s: "50", l: "75", alpha: "0.5" });
    });

    it("matches hsl with slash alpha as percentage (modern CSS syntax)", () => {
      assertHslMatchValues("hsl(120 50% 75% / 50%)", { h: "120", s: "50", l: "75", alpha: "50%" });
    });

    it("matches hsl with slash alpha as integer (no percent)", () => {
      assertHslMatchValues("hsl(10 10% 10% / 0.1)", { h: "10", s: "10", l: "10", alpha: "0.1" });
    });

    it("matches hsl with slash alpha as integer percentage", () => {
      assertHslMatchValues("hsl(10 10% 10% / 10%)", { h: "10", s: "10", l: "10", alpha: "10%" });
    });

    it("matches hsla with comma alpha", () => {
      assertHslAlphaMatch("hsla(120 50% 75%, 0.3)", "0.3");
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
      assertHslMatchValues("hsl(  120,  50%,  75%  )", { h: "120", s: "50", l: "75" });
    });

    it("matches with no spaces", () => {
      assertHslMatchValues("hsl(120,50%,75%)", { h: "120", s: "50", l: "75" });
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
