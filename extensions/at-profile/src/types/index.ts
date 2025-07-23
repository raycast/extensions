import { Image } from "@raycast/api";

export interface App {
  name: string;
  value: string;
  urlTemplate: string;
}

export interface OpenProfileFormProps {
  initialProfile?: string;
  initialApp?: string;
}

export type Input = {
  profile: string;
  app: string;
};

export interface YAMLSettings {
  version: string;
  usageHistory: UsageHistoryItem[];
  appSettings: Record<string, boolean>;
  customApps: Array<{
    id?: string;
    name: string;
    value: string;
    urlTemplate: string;
    enabled: boolean;
  }>;
}

export interface AppSetting {
  value: string;
  enabled: boolean;
}

export interface UsageHistoryItem {
  username: string;
  app: string;
  appName: string;
  timestamp: number;
}

export interface CustomAppInput {
  name: string;
  urlTemplate: string;
  enabled?: boolean;
}

export interface CustomAppUpdate {
  name?: string;
  urlTemplate?: string;
  enabled?: boolean;
}

export interface HistoryItemWithFavicon extends UsageHistoryItem {
  favicon?: Image.ImageLike;
}

export interface OpenProfileArguments {
  profile?: string;
  app?: string;
}

export interface CustomAppFormProps {
  app?: {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
  };
  onSave?: () => void;
}

export interface AppItem {
  urlTemplate: string;
  value: string;
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  isDefault: boolean;
  icon?: Image.ImageLike;
}

export interface ManageAppsArguments {
  action?: "import" | "export";
}
