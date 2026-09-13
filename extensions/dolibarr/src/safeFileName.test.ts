import { describe, expect, it } from "vitest";
import { safeFileName } from "./safeFileName";

describe("safeFileName", () => {
  it("leaves ordinary document references untouched", () => {
    expect(safeFileName("R202608-0179")).toBe("R202608-0179");
    expect(safeFileName("A202608-0092")).toBe("A202608-0092");
  });

  it("prevents escaping the cache directory", () => {
    expect(safeFileName("../../etc/passwd")).not.toContain("/");
    expect(safeFileName("../../etc/passwd")).not.toMatch(/^\./);
  });

  it("replaces slashes and spaces", () => {
    expect(safeFileName("A/B C")).toBe("A_B_C");
  });

  it("falls back to a placeholder when nothing remains", () => {
    expect(safeFileName("")).toBe("document");
  });

  it("caps the length", () => {
    expect(safeFileName("X".repeat(500)).length).toBe(100);
  });
});
