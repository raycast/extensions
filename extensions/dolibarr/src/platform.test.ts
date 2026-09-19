import { describe, expect, it } from "vitest";
import { isMacOS } from "./platform";

describe("isMacOS", () => {
  it("recognises macOS", () => {
    expect(isMacOS("darwin")).toBe(true);
  });

  it("does not mistake Windows for macOS", () => {
    expect(isMacOS("win32")).toBe(false);
  });

  it("treats anything else as not macOS", () => {
    expect(isMacOS("linux")).toBe(false);
  });
});
