import { Image } from "@raycast/api";

// === Core App Types ===
export interface App {
  name: string;
  value: string;
  urlTemplate: string;
  placeholder: string;
  visible?: boolean;
}

export interface CustomApp extends App {
  id: string;
  createdAt: string;
}

export interface AppSetting {
  value: string;
  visible: boolean;
}

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
export interface CustomAppInput {
  name: string;
  urlTemplate: string;
  visible?: boolean;
}

export interface CustomAppUpdate {
  name?: string;
  urlTemplate?: string;
  visible?: boolean;
}

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
export interface OpenProfileArguments {
  app?: string;
  profile?: string;
}

export interface QuickOpenArguments {
  profile: string;
  site: string;
}

export interface ManageAppsArguments {
  action?: "import" | "export";
}

// === Form Props ===
export interface OpenProfileFormProps {
  initialProfile?: string;
  initialApp?: string;
  onSubmit?: (values: { profile: string; app: string }) => Promise<void>;
}

export type Input = {
  profile: string;
  app: string;
};

// === History Types ===
export interface UsageHistoryItem {
  profile: string;
  app: string;
  appName: string;
  timestamp: number;
}

export interface HistoryItem {
  url: string | URL;
  profile: string;
  app: string;
  appName: string;
  favicon?: string;
  timestamp: number;
}

export interface HistoryItemWithFavicon extends UsageHistoryItem {
  favicon?: Image.ImageLike;
  url?: string;
}

// === Import/Export Types ===
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
