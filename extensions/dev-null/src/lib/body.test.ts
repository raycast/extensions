import { describe, expect, it } from "vitest";
import { bodyCharacterCount, bodyError, normalizeBody } from "./body";

describe("bodyCharacterCount", () => {
  it("counts code points, not UTF-16 units, after trimming", () => {
    expect(bodyCharacterCount("  ship 👍🏽  ")).toBe(7);
  });

  it("counts a long prose link as 23 characters", () => {
    const link = `https://example.com/${"a".repeat(100)}`;
    expect(bodyCharacterCount(`see ${link}`)).toBe(4 + 23);
  });

  it("counts a bare domain on a known TLD as a link, but not a file name", () => {
    const domain = `raycast.com/${"b".repeat(40)}`;
    expect(bodyCharacterCount(domain)).toBe(23);
    expect(bodyCharacterCount(`${"c".repeat(40)}.php`)).toBe(44);
  });

  it("leaves trailing punctuation out of the link", () => {
    const link = `https://example.com/${"d".repeat(40)}`;
    expect(bodyCharacterCount(`${link}.`)).toBe(23 + 1);
  });

  it("counts a link inside code literally", () => {
    const link = `https://example.com/${"e".repeat(40)}`;
    expect(bodyCharacterCount(`\`${link}\``)).toBe(link.length + 2);
  });

  it("collapses three or more blank lines in prose before counting", () => {
    expect(normalizeBody("a\n\n\n\nb")).toBe("a\n\nb");
    expect(bodyCharacterCount("a\n\n\n\nb")).toBe(4);
  });
});

describe("bodyError", () => {
  it("refuses an empty or blank commit", () => {
    expect(bodyError("")).toMatch(/Write something/);
    expect(bodyError(" \n\t")).toMatch(/Write something/);
  });

  it("accepts exactly 4,000 characters and refuses 4,001", () => {
    expect(bodyError("x".repeat(4000))).toBeUndefined();
    expect(bodyError("x".repeat(4001))).toContain(`${(4001).toLocaleString()} of ${(4000).toLocaleString()}`);
  });

  it("accepts a commit over 4,000 raw characters that fits once links are discounted", () => {
    const link = `https://example.com/${"f".repeat(200)}`;
    const body = `${"x".repeat(3900)} ${link}`;
    expect(body.length).toBeGreaterThan(4000);
    expect(bodyError(body)).toBeUndefined();
  });

  it("refuses a link longer than 2,048 characters", () => {
    expect(bodyError(`https://example.com/${"g".repeat(2048)}`)).toContain((2048).toLocaleString());
  });

  it("refuses more than 40,000 raw characters even when links bring the count down", () => {
    const link = `https://example.com/${"h".repeat(2000)} `;
    expect(bodyError(link.repeat(20))).toContain((40000).toLocaleString());
  });

  it("refuses a lone surrogate, which can't be sent as UTF-8", () => {
    expect(bodyError("broken \ud83d")).toMatch(/can't be sent/);
  });
});
