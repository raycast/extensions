import { describe, it, expect } from "vitest";
import { defaultIconModeForStyle } from "../default-icon-mode.util";
import { IconStyle, IconMode } from "../../types/types";

describe("defaultIconModeForStyle", () => {
  it("returns None for Default since it has no sub-options", () => {
    expect(defaultIconModeForStyle(IconStyle.Default)).toBe(IconMode.None);
  });

  it("returns the first available mode for each non-Default style", () => {
    expect(defaultIconModeForStyle(IconStyle.Dark)).toBe(IconMode.Always);
    expect(defaultIconModeForStyle(IconStyle.Clear)).toBe(IconMode.Light);
    expect(defaultIconModeForStyle(IconStyle.Tinted)).toBe(IconMode.Light);
  });
});
