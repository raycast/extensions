export enum primaryActionEnum {
  paste = "paste",
  copy = "copy",
  pasteName = "pasteName",
  copyName = "copyName",
  pasteFile = "pasteFile",
  copyFile = "copyFile",
  copyURL = "copyURL",
  copyDataURI = "copyDataURI",
}

export enum iconColorEnum {
  default = "currentColor",
  customColor = "customColor",
}

export type SetCategory =
  | "General"
  | "Emoji"
  | "Brands / Social"
  | "Maps / Flags"
  | "Thematic"
  | "Archive / Unmaintained"
  | "";

export interface SetResponse {
  name: string;
  total: number;
  author: {
    name: string;
    url: string;
  };
  license: {
    title: string;
    spdx: string;
    url: string;
  };
  samples: string[];
  category: SetCategory | undefined;
  palette: boolean;
  hidden: boolean | undefined;
}

export interface DataSet {
  id: string;
  name: string;
  category: SetCategory;
}

export interface IconResponse {
  prefix: string;
  icons: Record<
    string,
    {
      body: string;
    }
  >;
  width: number;
  height: number;
}

export interface DataIcon {
  set: {
    id: string;
    title: string;
  };
  id: string;
  width: number;
  height: number;
  body: string;
}

export interface QueryResponse {
  icons: string[];
  collections: Record<string, SetResponse>;
}

export type IconNameFormat =
  | "icon-name"
  | "IconName"
  | "set-name:icon-name"
  | "set-name-icon-name"
  | "set-name/icon-name"
  | "set-name--icon-name"
  | "setNameIconName"
  | "SetNameIconName"
  | "<SetNameIconName />"
  | "<set-name-icon-name />"
  | "i-set-name:icon-name"
  | "i-set-name-icon-name"
  | "icon-[set-name--icon-name]";

export interface Preferences {
  primaryAction: primaryActionEnum;
  iconColor: iconColorEnum;
  customColor: string;
  iconNameFormat: IconNameFormat;
}

export interface LaunchContext {
  hex?: string;
}
