export type AppEntry = {
  id: string;
  name: string;
  target: string;
  icon?: string;
};

export type AppGroup = {
  id: string;
  name: string;
  icon?: string;
  apps: AppEntry[];
};

export const STORAGE_KEY = "quick-launch.app-groups.v2";
