export type Instance = {
  name: string;
  id: string;
  icon?: string;
  favorite?: boolean;
  hasServers?: boolean;
  hasScreenshots?: boolean;
  minecraftVersion?: string;
  /** Display name of the mod loader, e.g. "Fabric", "Forge" or "Vanilla" */
  loader?: string;
  loaderVersion?: string;
};

export type Screenshot = {
  path: string;
  /** File name without extension */
  name: string;
  instanceId: string;
  instanceName: string;
  modifiedAt: number;
};

export type Server = {
  name: string;
  address: string;
  favicon?: string;
  icon?: string;
  instanceId: string;
  instanceName: string;
  favorite?: boolean;
  secret?: string;
  online?: boolean;
  playersOnline?: number;
  playersMax?: number;
  version?: string;
};
