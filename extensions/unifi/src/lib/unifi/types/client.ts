export type ClientType = "WIRED" | "WIRELESS" | "VPN" | "TELEPORT";

export interface Client {
  /** Unique identifier in UUID format */
  id: string;

  name: string;

  /** ISO 8601 date-time string */
  connectedAt: string;

  ipAddress: string;

  type: ClientType;

  macAddress: string;

  /** Reference to connected device UUID */
  uplinkDeviceId: string;
}

export type Clients = Client[];
