import { describe, it, expect } from "vitest";
import { capitalize } from "../capitalize.util";

describe("capitalize", () => {
  it("uppercases the first character and preserves the rest", () => {
    expect(capitalize("light")).toBe("Light");
    expect(capitalize("auto")).toBe("Auto");
  });

  it("returns an empty string unchanged", () => {
    expect(capitalize("")).toBe("");
  });
});
