export interface OpenLinkApplication {
  bundleId?: string;
  name: string;
  path: string;
  rankText: number;
  rankURL: number;
  rankEmail: number;
  add?: boolean;
  suggest?: boolean;
  support?: ItemType[];
  type?: AppType;
}

export enum ItemType {
  TEXT = "Text",
  URL = "URL",
  EMAIL = "Email",
  NULL = "",
}
export enum AppType {
  BROWSER = "Browser",
  EMAIL_CLIENT = "Email Client",
  OTHER = "Other",
}

export enum ItemSource {
  SELECTED = "Selected",
  CLIPBOARD = "Clipboard",
  ENTER = "Enter",
  NULL = "",
}

export enum LocalStorageKey {
  CUSTOM_APPS = "Custom Apps",
}
