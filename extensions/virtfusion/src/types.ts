export type Panel = {
  id: string;
  title: string;
  virtfusion_url: string;
  api_token: string;
};

export type Server = {
  id: string;
  name: string;
  bootOrder: Array<"hd" | "cdrom">;
  memory: string;
  cpu: string;
  storage: Array<{
    capacity: string;
    enabled: boolean;
    primary: boolean;
  }>;
  network: {
    primary: {
      limit: string;
      ipv4: Array<{
        address: string;
        gateway: string;
        netmask: string;
      }>;
      ipv6: Array<{
        addresses: string[];
      }>;
    };
  };
};

export type SSHKey = {
  id: number;
  name: string;
  publicKey: string;
  type: string;
  enabled: boolean;
  created: string;
};

export type Task = {
  action: string;
  started: string;
  updated: string;
  finished: string;
  completed: boolean;
  status: string;
  success: boolean;
};

export type SingleResult<T> = {
  data: T;
};
export type PaginatedResult<T> = {
  data: T[];
  next_page_url: string | null;
};
