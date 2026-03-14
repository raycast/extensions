import { describe, it, expect } from "vitest";
import { profileSubtitle } from "../profile-subtitle.util";
import { IconStyle, IconMode, Appearance, type Profile } from "../../types/types";

const makeProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: "test-id",
  name: "Test",
  wallpaperPath: "",
  iconStyle: IconStyle.Default,
  iconMode: IconMode.None,
  appearance: Appearance.Auto,
  ...overrides,
});

describe("profileSubtitle", () => {
  it("shows only the style name when there is no mode", () => {
    expect(profileSubtitle(makeProfile())).toBe("Default");
  });

  it("joins style and mode with a middot when a mode is set", () => {
    expect(profileSubtitle(makeProfile({ iconStyle: IconStyle.Dark, iconMode: IconMode.Always }))).toBe(
      "Dark \u00b7 Always",
    );
    expect(profileSubtitle(makeProfile({ iconStyle: IconStyle.Clear, iconMode: IconMode.Dark }))).toBe(
      "Clear \u00b7 Dark",
    );
  });
});
