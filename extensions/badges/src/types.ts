import { FieldType } from "./components/parameters.js";

type DuplicateAlias = {
  title: string;
  hex?: string;
  guidelines?: string;
  loc?: Localization;
};

export type Localization = {
  [languageCode: string]: string;
};

export type Aliases = {
  aka?: string[];
  dup?: DuplicateAlias[];
  loc?: Localization;
};

export type IconData = {
  title: string;
  hex: string;
  source: string;
  slug: string;
  file: string;
  guidelines?: string;
  license?: { type: string; url?: string };
  aliases?: Aliases;
};

export type StaticBadge = {
  label?: string;
  message?: string;
  color?: string;
  labelColor?: string;
  style?: string;
  logo?: string;
  logoColor?: string;
  logoSize?: string;
};

export type DynamicBadge = {
  $type?: string;
  url?: string;
  query?: string;
  prefix?: string;
  suffix?: string;
  style?: string;
  logo?: string;
  logoColor?: string;
  logoSize?: string;
  label?: string;
  labelColor?: string;
  color?: string;
};

export type EndpointBadge = {
  url?: string;
  style?: string;
  logo?: string;
  logoColor?: string;
  logoSize?: string;
  label?: string;
  labelColor?: string;
  color?: string;
};

export type SimpleIcons = {
  $icon?: IconData;
};

export type Badge = SimpleIcons & StaticBadge & DynamicBadge & EndpointBadge;

export type FieldName = keyof Omit<Badge, "$icon">;

export type LaunchFromSimpleIconsContext = {
  launchFromExtensionName: string;
  icon: IconData;
};

export type LaunchFromColorPickerContext = {
  launchFromExtensionName: string;
  field: keyof Badge;
  hex: string;
};

export type CommandConfig = Record<
  string,
  { defaultBadge: Badge; parameterIds: FieldType[]; validationFields: string[] }
>;

export type OnBadgeChange = (badge: Badge) => void;

export type ParameterProps = {
  badge: Badge;
  onChange: OnBadgeChange;
};
