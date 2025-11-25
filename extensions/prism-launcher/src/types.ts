export type Instance = {
  name: string;
  id: string;
  icon?: string;
  favorite?: boolean;
  hasServers?: boolean;
  accessories: { text?: string | null; icon?: string | null }[];
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
