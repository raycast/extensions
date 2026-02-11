export type Instance = {
  name: string;
  id: string;
  icon?: string;
  favorite?: boolean;
  hasServers?: boolean;
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
};
