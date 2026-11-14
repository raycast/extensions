import type { PlatformId } from "../catalog/platforms";

/**
 * A social app/platform that can be used to open profiles
 */
export interface App {
  name: string;
  /** Stable ID. Generated from the URL template when a custom app is created, and never changed after. */
  value: string;
  urlTemplate: string;
  placeholder: string;
  /** The software the site runs, for a custom app on a Mastodon server, Discourse forum and so on */
  platform?: PlatformId;
  /** Hidden from Find Profile unless NSFW sites are included */
  nsfw?: boolean;
  /** On an ATProto app, the server a bare name belongs to: `example` means `example.bsky.social` */
  handleDomain?: string;
}

/**
 * An app with its Manage Apps state
 */
export interface AppEntry extends App {
  visible: boolean;
  isDefault: boolean;
}

/**
 * App visibility settings stored in local storage
 */
export interface AppSetting {
  value: string;
  visible: boolean;
}

export interface CustomAppInput {
  name: string;
  urlTemplate: string;
  platform?: PlatformId;
  nsfw?: boolean;
  handleDomain?: string;
}

/**
 * Arguments for the quick-open command
 */
export interface QuickOpenArguments {
  profile: string;
  app: string;
}

/**
 * Input type for the AI tools
 */
export type Input = {
  profile: string;
  app: string;
};

/**
 * One profile + app pair in History
 */
export interface UsageHistoryItem {
  profile: string;
  app: string;
  appName: string;
  timestamp: number;
  count: number;
}

/**
 * Structure for importing/exporting extension settings as YAML
 */
export interface YAMLSettings {
  version: string;
  usageHistory: UsageHistoryItem[];
  visible: Record<string, boolean>;
  customApps: Array<{
    name: string;
    value: string;
    urlTemplate: string;
    visible: boolean;
    platform?: PlatformId;
    nsfw?: boolean;
    handleDomain?: string;
  }>;
}
