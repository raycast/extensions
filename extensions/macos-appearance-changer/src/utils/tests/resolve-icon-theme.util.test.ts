import { describe, it, expect } from "vitest";
import { resolveIconThemePreference } from "../resolve-icon-theme.util";
import { IconStyle, IconMode, IconThemePreference } from "../../types/types";

const ALL_VALID_COMBINATIONS: [IconStyle, IconMode, IconThemePreference][] = [
  [IconStyle.Default, IconMode.None, IconThemePreference.Default],
  [IconStyle.Dark, IconMode.Always, IconThemePreference.RegularDark],
  [IconStyle.Dark, IconMode.Auto, IconThemePreference.RegularAutomatic],
  [IconStyle.Clear, IconMode.Light, IconThemePreference.ClearLight],
  [IconStyle.Clear, IconMode.Dark, IconThemePreference.ClearDark],
  [IconStyle.Clear, IconMode.Auto, IconThemePreference.ClearAutomatic],
  [IconStyle.Tinted, IconMode.Light, IconThemePreference.TintedLight],
  [IconStyle.Tinted, IconMode.Dark, IconThemePreference.TintedDark],
  [IconStyle.Tinted, IconMode.Auto, IconThemePreference.TintedAutomatic],
];

describe("resolveIconThemePreference", () => {
  it.each(ALL_VALID_COMBINATIONS)("%s + %s -> %s", (style, mode, expected) => {
    expect(resolveIconThemePreference(style, mode)).toBe(expected);
  });

  it("falls back to Default for an impossible combination like Dark + Light", () => {
    expect(resolveIconThemePreference(IconStyle.Dark, IconMode.Light)).toBe(IconThemePreference.Default);
  });
});
