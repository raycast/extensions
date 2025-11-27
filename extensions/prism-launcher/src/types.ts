export type Instance = {
  name: string;
  id: string;
  icon?: string;
  favorite?: boolean;
  hasServers?: boolean;
  accessories: Accessories;
};

export type Accessories = Array<{
  text?: string;
  icon?: string;
}>;

export type Server = {
  name: string;
  address: string;
  favicon?: string;
  icon?: string;
  instanceId: string;
  instanceName: string;
  favorite?: boolean;
  secret?: string;
};

export type MMCPack = {
  components: Array<{
    cachedName: string;
    version: string;
  }>;
};
