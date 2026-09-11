import { IconStyle, IconMode, IconThemePreference } from "../types/types";

const ICON_THEME_LOOKUP: Record<IconStyle, Partial<Record<IconMode, IconThemePreference>>> = {
  [IconStyle.Default]: { [IconMode.None]: IconThemePreference.Default },
  [IconStyle.Dark]: {
    [IconMode.Always]: IconThemePreference.RegularDark,
    [IconMode.Auto]: IconThemePreference.RegularAutomatic,
  },
  [IconStyle.Clear]: {
    [IconMode.Light]: IconThemePreference.ClearLight,
    [IconMode.Dark]: IconThemePreference.ClearDark,
    [IconMode.Auto]: IconThemePreference.ClearAutomatic,
  },
  [IconStyle.Tinted]: {
    [IconMode.Light]: IconThemePreference.TintedLight,
    [IconMode.Dark]: IconThemePreference.TintedDark,
    [IconMode.Auto]: IconThemePreference.TintedAutomatic,
  },
};

export const resolveIconThemePreference = (style: IconStyle, mode: IconMode): IconThemePreference =>
  ICON_THEME_LOOKUP[style]?.[mode] ?? IconThemePreference.Default;
