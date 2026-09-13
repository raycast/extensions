export interface StoredApp {
  name: string;
  bundleId: string;
  path: string;
}

export interface RaycastCommandStep {
  id: string;
  deeplink: string;
  waitBeforeMs: number;
}

export interface AppGroup {
  id: string;
  name: string;
  description?: string;
  icon: string;
  apps: StoredApp[];
  startShortcut?: string;
  quitShortcut?: string;
  afterStartCommands?: RaycastCommandStep[];
  afterEndCommands?: RaycastCommandStep[];
}
