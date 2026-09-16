import { describe, expect, it } from "vitest";
import { tagColorHex } from "../tagColors";

describe("tagColorHex", () => {
  it("resolves a known token to its hex swatch", () => {
    expect(tagColorHex("blue")).toBe("#7A82DB");
    expect(tagColorHex("red")).toBe("#CD737B");
  });

  it("resolves every token TagColorToken defines, without throwing", () => {
    const tokens = [
      "red",
      "orange",
      "amber",
      "green",
      "teal",
      "blue",
      "purple",
      "pink",
    ];
    for (const token of tokens) {
      const hex = tagColorHex(token);
      expect(hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("falls back to undefined for a tag with no colour", () => {
    expect(tagColorHex(undefined)).toBeUndefined();
  });

  it("falls back to undefined rather than throwing for an unrecognised token", () => {
    expect(tagColorHex("chartreuse")).toBeUndefined();
    expect(tagColorHex("")).toBeUndefined();
  });
});
