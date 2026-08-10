export enum ConnectionStatus {
  Connected = "connected",
  Disconnected = "disconnected",
  Unknown = "unknown",
}

export type StatusResult = {
  status: ConnectionStatus;
  disconnectReason: string;
};

export type VirtualNetwork = {
  id: string;
  name: string;
  description: string;
  default: boolean;
  active: boolean;
};

export type VNetResult = {
  active_vnet_id: string;
  virtual_networks: Omit<VirtualNetwork, "active">[];
};
