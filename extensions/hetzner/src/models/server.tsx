export type HetznerStatus =
  | "running"
  | "initializing"
  | "starting"
  | "stopping"
  | "off"
  | "deleting"
  | "migrating"
  | "rebuilding"
  | "unknown";

export interface HetznerServerPageMetaData {
  previous_page: number | null;
  next_page: number | null;
  page: number;
}

export interface HetznerServerPrice {
  location: string;
  price_monthly: {
    net: string;
    gross: string;
  };
}

export interface HetznerServer {
  id: number;
  status: HetznerStatus;
  name: string;
  public_net: {
    ipv4: {
      ip: string;
    };
    ipv6: {
      ip: string;
    };
  };
  server_type: {
    name: string;
    cores: number;
    memory: number;
    disk: number;
    prices: HetznerServerPrice[];
  };
  datacenter: {
    name: string;
    location: {
      name: string;
      city: string;
      country: string;
      network_zone: string;
    };
  };
  usedPrice?: HetznerServerPrice;
}

export interface HetznerActionResponseData {
  action: {
    error: {
      code: string;
      message: string;
    } | null;
    status: "success" | "running" | "error";
  };
}

export type UpdateServerStatus = (
  serverId: number,
  status: HetznerStatus,
) => void;
