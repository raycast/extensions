import { describe, expect, it } from "vitest";
import { validate, compliments } from "../src/data/compliments.schema";

const valid = (over: Record<string, unknown> = {}) => ({
  id: "warm-001",
  text: "You make people feel safe to be themselves",
  tone: "warm",
  ...over,
});

describe("compliments validate", () => {
  it("accepts a valid array", () => {
    expect(() => validate([valid()])).not.toThrow();
  });

  it("returns parsed entries", () => {
    const out = validate([valid({ id: "warm-100" }), valid({ id: "warm-101" })]);
    expect(out).toHaveLength(2);
    expect(out[0].id).toBe("warm-100");
  });

  it("rejects non-array root", () => {
    expect(() => validate("nope")).toThrow(/expected an array/);
    expect(() => validate({ entries: [] })).toThrow(/expected an array/);
    expect(() => validate(null)).toThrow(/expected an array/);
  });

  it("rejects null entry", () => {
    expect(() => validate([null])).toThrow(/entry is not an object/);
  });

  it("rejects non-object entry", () => {
    expect(() => validate(["string"])).toThrow(/entry is not an object/);
    expect(() => validate([42])).toThrow(/entry is not an object/);
  });

  it("rejects missing id", () => {
    expect(() => validate([{ text: "hi", tone: "warm" }])).toThrow(/invalid id/);
  });

  it("rejects empty id", () => {
    expect(() => validate([valid({ id: "" })])).toThrow(/invalid id/);
  });

  it("rejects non-string id", () => {
    expect(() => validate([valid({ id: 1 })])).toThrow(/invalid id/);
  });

  it("rejects missing text", () => {
    expect(() => validate([valid({ text: undefined })])).toThrow(/invalid text/);
  });

  it("rejects empty/whitespace text", () => {
    expect(() => validate([valid({ text: "" })])).toThrow(/invalid text/);
    expect(() => validate([valid({ text: "   " })])).toThrow(/invalid text/);
  });

  it("rejects invalid tone", () => {
    expect(() => validate([valid({ tone: "bogus" })])).toThrow(/invalid tone/);
    expect(() => validate([valid({ tone: 1 })])).toThrow(/invalid tone/);
    expect(() => validate([valid({ tone: undefined })])).toThrow(/invalid tone/);
  });

  it("accepts every valid tone", () => {
    for (const tone of ["warm", "playful", "sincere", "specific-skill"]) {
      expect(() => validate([valid({ id: `${tone}-999`, tone })])).not.toThrow();
    }
  });

  it("rejects duplicate id", () => {
    expect(() => validate([valid({ id: "warm-100" }), valid({ id: "warm-100" })])).toThrow(/duplicate id/);
  });
});

describe("compliments corpus", () => {
  it("loads at module scope without throwing", () => {
    expect(compliments.length).toBeGreaterThanOrEqual(75);
  });

  it("has unique ids", () => {
    const ids = compliments.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
