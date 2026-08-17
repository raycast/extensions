import { describe, expect, it } from "vitest";
import { cleaner } from "./helpers";

describe("paragraph dedent", () => {
  it("dedents copied prose with shared paragraph indentation", () => {
    const input = `Hi Sarah,

 Thanks for getting back to me so quickly!

 I wanted to follow up on our earlier conversation about the project timeline.

 Let me know if you have any questions.`;

    const expected = `Hi Sarah,

Thanks for getting back to me so quickly!

I wanted to follow up on our earlier conversation about the project timeline.

Let me know if you have any questions.`;

    expect(cleaner().dedentParagraphIndent(input)).toBe(expected);
  });

  it("dedents all indented prose lines by the common indent only", () => {
    const input = `  First paragraph line.
    Nested detail stays relatively indented.
  Final paragraph line.`;

    const expected = `First paragraph line.
  Nested detail stays relatively indented.
Final paragraph line.`;

    expect(cleaner().dedentParagraphIndent(input)).toBe(expected);
  });

  it("does not dedent bullet lists", () => {
    const input = `  - first item
  - second item
  - third item`;
    expect(cleaner().dedentParagraphIndent(input)).toBeNull();
  });

  it("does not dedent source code", () => {
    const input = `  struct Example {
      let value = 1
  }`;
    expect(cleaner().dedentParagraphIndent(input)).toBeNull();
  });

  it("does not dedent structured JSON", () => {
    const input = `  {
    "name": "Trimmy",
    "enabled": true
  }`;
    expect(cleaner().dedentParagraphIndent(input)).toBeNull();
  });
});
