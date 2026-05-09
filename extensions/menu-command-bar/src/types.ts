// Menu Command Bar v01

export type MenuItem = {
  path: string[];
  shortcut: string;
  enabled: boolean;
};

export type MenuListing = {
  appName: string;
  bundleId: string;
  items: MenuItem[];
};

export type MruEntry = {
  path: string[];
  ts: number;
};
