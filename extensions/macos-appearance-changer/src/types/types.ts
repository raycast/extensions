export enum IconStyle {
  Default = "Default",
  Dark = "Dark",
  Clear = "Clear",
  Tinted = "Tinted",
}

export enum IconMode {
  None = "",
  Always = "Always",
  Auto = "Auto",
  Light = "Light",
  Dark = "Dark",
}

export enum Appearance {
  Light = "light",
  Dark = "dark",
  Auto = "auto",
}

export enum IconThemePreference {
  Default = "",
  RegularDark = "RegularDark",
  RegularAutomatic = "RegularAutomatic",
  ClearLight = "ClearLight",
  ClearDark = "ClearDark",
  ClearAutomatic = "ClearAutomatic",
  TintedLight = "TintedLight",
  TintedDark = "TintedDark",
  TintedAutomatic = "TintedAutomatic",
}

export interface Profile {
  id: string;
  name: string;
  wallpaperPath: string;
  iconStyle: IconStyle;
  iconMode: IconMode;
  appearance: Appearance;
}
