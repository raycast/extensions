import { Image } from "@raycast/api";

// === Core App Types ===

/**
 * Represents a social app/platform that can be used to open profiles
 */
export interface App {
  name: string;
  value: string;
  urlTemplate: string;
  placeholder: string;
  visible?: boolean;
}

/**
 * Extended app interface for custom apps with additional metadata
 */
export interface CustomApp extends App {
  id: string;
  createdAt: string;
}

/**
 * App visibility settings stored in local storage
 */
export interface AppSetting {
  value: string;
  visible: boolean;
}

/**
 * App item used in UI components with computed properties
 */
export interface AppItem {
  urlTemplate: string;
  value: string;
  id: string;
  name: string;
  url: string;
  visible: boolean;
  isDefault: boolean;
  icon?: Image.ImageLike;
}

// === Custom App Management ===

/**
 * Input data for creating a new custom app
 */
export interface CustomAppInput {
  name: string;
  urlTemplate: string;
  visible?: boolean;
}

/**
 * Update data for modifying an existing custom app
 */
export interface CustomAppUpdate {
  name?: string;
  urlTemplate?: string;
  visible?: boolean;
}

/**
 * Props for the custom app form component
 */
export interface CustomAppFormProps {
  app?: {
    id: string;
    name: string;
    urlTemplate: string;
    visible: boolean;
  };
  onSave?: () => void;
}

// === Command Arguments ===

/**
 * Arguments for the open-profile command
 */
export interface OpenProfileArguments {
  app?: string;
  profile?: string;
}

/**
 * Arguments for the quick-open command
 */
export interface QuickOpenArguments {
  profile: string;
  app: string;
}

/**
 * Arguments for the manage-apps command
 */
export interface ManageAppsArguments {
  action?: "import" | "export";
}

// === Form Props ===

/**
 * Props for the open profile form component
 */
export interface OpenProfileFormProps {
  initialProfile?: string;
  initialApp?: string;
  onSubmit?: (values: { profile: string; app: string }) => Promise<void>;
}

/**
 * Input type for AI tools - contains profile and app identifiers
 */
export type Input = {
  profile: string;
  app: string;
};

// === History Types ===

/**
 * Represents a single usage history entry tracking profile + app combinations
 */
export interface UsageHistoryItem {
  profile: string;
  app: string;
  appName: string;
  timestamp: number;
}

/**
 * Extended history item with URL and favicon information
 */
export interface HistoryItem {
  url: string | URL;
  profile: string;
  app: string;
  appName: string;
  favicon?: string;
  timestamp: number;
}

/**
 * Usage history item enhanced with favicon and URL for UI display
 */
export interface HistoryItemWithFavicon extends UsageHistoryItem {
  favicon?: Image.ImageLike;
  url?: string;
}

// === Import/Export Types ===

/**
 * Structure for importing/exporting extension settings as YAML
 */
export interface YAMLSettings {
  version: string;
  usageHistory: UsageHistoryItem[];
  visible: Record<string, boolean>;
  customApps: Array<{
    id?: string;
    name: string;
    value: string;
    urlTemplate: string;
    visible: boolean;
  }>;
}
