import { LaunchOptions } from "raycast-cross-extension";

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
  code: number;
  title: string;
  hex: string;
  source: string;
  slug: string;
  guidelines?: string;
  license?: { type: string; url?: string };
  aliases?: Aliases;
};

export type JsDelivrNpmResponse = {
  type: string;
  name: string;
  tags: Record<string, string>;
  versions: Array<{
    version: string;
    links: Record<string, string>;
  }>;
  links: Record<string, string>;
};

export type LaunchContext = {
  launchFromExtensionTitle?: string;
  showCopyActions?: boolean;
  callbackLaunchOptions: LaunchOptions;
};
