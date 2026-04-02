export type Instance = {
  name: string;
  id: string;
  icon?: string;
  favorite?: boolean;
  hasServers?: boolean;
  accessories: Accessory[];
};

export type Accessory = {
  version: string;
  icon: string;
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

export type MMCPack = {
  components: Array<{
    cachedName: string;
    cachedVersion?: string;
    version: string;
    uid: string;
  }>;
};
