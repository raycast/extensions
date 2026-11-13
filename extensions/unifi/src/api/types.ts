export type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export interface Page<T> {
  count: number;
  data: T[];
  limit: number;
  offset: number;
  totalCount: number;
}

export interface Site {
  id: string;
  internalReference: string;
  name: string;
}

export type NetworkDeviceState =
  | "ONLINE"
  | "OFFLINE"
  | "PENDING_ADOPTION"
  | "UPDATING"
  | "GETTING_READY"
  | "ADOPTING"
  | "DELETING"
  | "CONNECTION_INTERRUPTED"
  | "ISOLATED"
  | "U5G_INCORRECT_TOPOLOGY";

export type NetworkDeviceFeature = "switching" | "accessPoint" | "gateway";
export type NetworkInterfaceKind = "ports" | "radios";

export interface NetworkDevice {
  features: NetworkDeviceFeature[];
  firmwareUpdatable: boolean;
  firmwareVersion?: string;
  id: string;
  interfaces: NetworkInterfaceKind[];
  ipAddress: string;
  macAddress: string;
  model: string;
  name: string;
  state: NetworkDeviceState;
  supported: boolean;
}

export type PortState = "UP" | "DOWN" | "UNKNOWN";
export type PortConnector = "RJ45" | "SFP" | "SFPPLUS" | "SFP28" | "QSFP28";

export interface NetworkPort {
  connector: PortConnector;
  idx: number;
  maxSpeedMbps: number;
  poe?: {
    enabled: boolean;
    standard: string;
    state: "UP" | "DOWN" | "LIMITED" | "UNKNOWN";
    type: number | string;
  };
  speedMbps?: number;
  state: PortState;
}

export interface NetworkRadio {
  channel: number;
  channelWidthMHz: number;
  frequencyGHz: "2.4" | "5" | "6" | "60";
  wlanStandard: string;
}

export interface NetworkDeviceDetails extends Omit<NetworkDevice, "features" | "interfaces"> {
  adoptedAt?: string;
  configurationId: string;
  features: {
    accessPoint?: unknown;
    gateway?: unknown;
    switching?: unknown;
  };
  interfaces: {
    ports?: NetworkPort[];
    radios?: NetworkRadio[];
  };
  provisionedAt?: string;
  uplink?: {
    deviceId?: string;
  };
}

export interface NetworkDeviceStatistics {
  cpuUtilizationPct?: number;
  interfaces?: {
    radios?: Array<{
      frequencyGHz: string;
      txRetriesPct?: number;
    }>;
  };
  lastHeartbeatAt?: string;
  loadAverage1Min?: number;
  loadAverage5Min?: number;
  loadAverage15Min?: number;
  memoryUtilizationPct?: number;
  nextHeartbeatAt?: string;
  uplink?: {
    rxRateBps?: number;
    txRateBps?: number;
  };
  uptimeSec?: number;
}

export type ClientType = "WIRED" | "WIRELESS" | "VPN" | "TELEPORT";

export interface NetworkClient {
  access: {
    authorized?: boolean;
    type?: string;
  };
  connectedAt?: string;
  id: string;
  ipAddress?: string;
  macAddress?: string;
  name: string;
  type: ClientType;
  uplinkDeviceId?: string;
}

export interface NetworkDefinition extends JsonObject {
  default: boolean;
  enabled: boolean;
  id: string;
  management: string;
  name: string;
  vlanId: number;
}

export interface WifiBroadcast extends JsonObject {
  enabled: boolean;
  id: string;
  name: string;
  type: string;
}

export interface FirewallPolicy extends JsonObject {
  action: JsonValue;
  enabled: boolean;
  id: string;
  index: number;
  name: string;
}

export interface WanInterface extends JsonObject {
  id: string;
  name: string;
}

export interface ProtectEntity extends JsonObject {
  id: string;
  mac?: string;
  modelKey?: string;
  name?: string | null;
  state?: string;
  type?: string;
}

export interface ProtectCamera extends ProtectEntity {
  activePatrolSlot?: number | null;
  hasPackageCamera?: boolean;
  isMicEnabled?: boolean;
  videoMode?: string;
}

export interface ProtectSensor extends ProtectEntity {
  alarmTriggeredAt?: number | null;
  batteryStatus?: JsonObject;
  isMotionDetected?: boolean;
  isOpened?: boolean;
  leakDetectedAt?: number | null;
  stats?: JsonObject;
}

export interface ProtectNvr extends JsonObject {
  armMode?: string | JsonObject;
  id: string;
  mac?: string;
  modelKey?: string;
  name?: string | null;
  type?: string;
}

export interface NetworkOverview {
  clients: NetworkClient[];
  devices: NetworkDevice[];
  firewallPolicies: FirewallPolicy[];
  networks: NetworkDefinition[];
  site: Site;
  unavailable: Array<{ resource: string; reason: string }>;
  wans: WanInterface[];
  wifiBroadcasts: WifiBroadcast[];
}

export interface ProtectOverview {
  collections: Record<string, ProtectEntity[]>;
  nvr?: ProtectNvr;
  unavailable: Array<{ resource: string; reason: string }>;
}
