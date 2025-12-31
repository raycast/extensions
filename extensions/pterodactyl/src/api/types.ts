export interface ServerAttributes {
  server_owner: boolean;
  identifier: string;
  uuid: string;
  name: string;
  node: string;
  sftp_details: {
    ip: string;
    port: number;
  };
  description: string;
  limits: {
    memory: number;
    swap: number;
    disk: number;
    io: number;
    cpu: number;
  };
  feature_limits: {
    databases: number;
    allocations: number;
    backups: number;
  };
  is_suspended: boolean;
  is_installing: boolean;
  relationships?: {
    allocations?: {
      data: Allocation[];
    };
  };
}

export interface Server {
  object: "server";
  attributes: ServerAttributes;
}

export interface Allocation {
  object: "allocation";
  attributes: {
    id: number;
    ip: string;
    ip_alias: string | null;
    port: number;
    notes: string | null;
    is_default: boolean;
  };
}

export interface PterodactylResponse<T> {
  object: string;
  data: T[];
  meta: {
    pagination: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
      links: Record<string, string>;
    };
  };
}

export interface ServerResources {
  object: "stats";
  attributes: {
    current_state: "starting" | "offline" | "running" | "stopping";
    is_suspended: boolean;
    resources: {
      memory_bytes: number;
      cpu_absolute: number;
      disk_bytes: number;
      network_rx_bytes: number;
      network_tx_bytes: number;
    };
  };
}
