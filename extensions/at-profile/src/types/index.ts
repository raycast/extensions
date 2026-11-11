/**
 * A social app/platform that can be used to open profiles
 */
export interface App {
  name: string;
  /** Stable ID. Generated from the URL template when a custom app is created, and never changed after. */
  value: string;
  urlTemplate: string;
  placeholder: string;
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
  }>;
}
