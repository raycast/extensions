import { describe, it, expect } from "vitest";
import { isValidProfile } from "../validate-profile.util";

const VALID_PROFILE = {
  id: "abc-123",
  name: "My Profile",
  wallpaperPath: "/path/to/image.jpg",
  iconStyle: "Dark",
  iconMode: "Always",
  appearance: "dark",
};

describe("isValidProfile", () => {
  it("accepts a well-formed profile", () => {
    expect(isValidProfile(VALID_PROFILE)).toBe(true);
  });

  it("accepts Default style with empty-string mode", () => {
    expect(isValidProfile({ ...VALID_PROFILE, iconStyle: "Default", iconMode: "" })).toBe(true);
  });

  it("rejects non-objects", () => {
    expect(isValidProfile(null)).toBe(false);
    expect(isValidProfile("string")).toBe(false);
    expect(isValidProfile(42)).toBe(false);
  });

  it("rejects when a required field is missing", () => {
    const { id: _id, ...noId } = VALID_PROFILE;
    void _id;
    expect(isValidProfile(noId)).toBe(false);
  });

  it("rejects enum values that don't exist in the domain", () => {
    expect(isValidProfile({ ...VALID_PROFILE, iconStyle: "Neon" })).toBe(false);
    expect(isValidProfile({ ...VALID_PROFILE, iconMode: "Sometimes" })).toBe(false);
    expect(isValidProfile({ ...VALID_PROFILE, appearance: "midnight" })).toBe(false);
  });
});
