import { describe, expect, it } from "vitest";
import { validate, prompts } from "../src/data/prompts.schema";

const valid = (over: Record<string, unknown> = {}) => ({
  id: "prompt-001",
  text: "What's something small that worked today?",
  context: "Use this when you want to acknowledge a quiet win.",
  examples: ["I noticed something today.", "Something I want to mention."],
  ...over,
});

describe("prompts validate", () => {
  it("accepts a valid array", () => {
    expect(() => validate([valid()])).not.toThrow();
  });

  it("returns parsed entries with all four fields", () => {
    const out = validate([valid()]);
    expect(out[0]).toMatchObject({
      id: "prompt-001",
      text: expect.any(String),
      context: expect.any(String),
      examples: expect.any(Array),
    });
  });

  it("rejects non-array root", () => {
    expect(() => validate("nope")).toThrow(/expected an array/);
    expect(() => validate(null)).toThrow(/expected an array/);
  });

  it("rejects null entry", () => {
    expect(() => validate([null])).toThrow(/entry is not an object/);
  });

  it("rejects missing/empty id", () => {
    expect(() => validate([valid({ id: undefined })])).toThrow(/invalid id/);
    expect(() => validate([valid({ id: "" })])).toThrow(/invalid id/);
  });

  it("rejects missing/empty text", () => {
    expect(() => validate([valid({ text: undefined })])).toThrow(/invalid text/);
    expect(() => validate([valid({ text: "   " })])).toThrow(/invalid text/);
  });

  it("rejects missing/empty context", () => {
    expect(() => validate([valid({ context: undefined })])).toThrow(/invalid context/);
    expect(() => validate([valid({ context: "" })])).toThrow(/invalid context/);
    expect(() => validate([valid({ context: "  " })])).toThrow(/invalid context/);
  });

  it("rejects examples not an array", () => {
    expect(() => validate([valid({ examples: "string" })])).toThrow(/invalid examples/);
    expect(() => validate([valid({ examples: undefined })])).toThrow(/invalid examples/);
  });

  it("rejects examples below 2", () => {
    expect(() => validate([valid({ examples: [] })])).toThrow(/invalid examples/);
    expect(() => validate([valid({ examples: ["one"] })])).toThrow(/invalid examples/);
  });

  it("rejects examples above 3", () => {
    expect(() => validate([valid({ examples: ["a", "b", "c", "d"] })])).toThrow(/invalid examples/);
  });

  it("rejects empty-string example", () => {
    expect(() => validate([valid({ examples: ["good", ""] })])).toThrow(/invalid examples/);
    expect(() => validate([valid({ examples: ["good", "   "] })])).toThrow(/invalid examples/);
  });

  it("rejects non-string example", () => {
    expect(() => validate([valid({ examples: ["good", 42] })])).toThrow(/invalid examples/);
  });

  it("accepts examples of length 2 and 3", () => {
    expect(() => validate([valid({ examples: ["a", "b"] })])).not.toThrow();
    expect(() => validate([valid({ id: "prompt-002", examples: ["a", "b", "c"] })])).not.toThrow();
  });

  it("rejects duplicate id", () => {
    expect(() => validate([valid({ id: "prompt-100" }), valid({ id: "prompt-100" })])).toThrow(/duplicate id/);
  });
});

describe("prompts corpus", () => {
  it("loads at module scope without throwing", () => {
    expect(prompts.length).toBe(12);
  });

  it("has sequential prompt-NNN ids", () => {
    const ids = prompts.map((p) => p.id).sort();
    expect(ids[0]).toBe("prompt-001");
    expect(ids[ids.length - 1]).toBe("prompt-012");
  });
});
