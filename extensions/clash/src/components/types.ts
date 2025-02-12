import { LocalStorage } from "@raycast/api";

// backends store in local storage
export type BackendsT = Map<string, LocalStorage.Value>;

// "/traffic"
export type TrafficT = { up: number; down: number };

// "/connections"
export type ConnectionsT = {
  downloadTotal: number;
  uploadTotal: number;
  connections: Array<ConnectionT>;
};
export type ConnectionT = {
  id: string;
  metadata: ConnectionMetadataT;
  upload: number;
  download: number;
  start: string;
  chains: Array<string>;
  rule: string;
  rulePayload: string;
};
export type ConnectionMetadataT = {
  network: string;
  type: string;
  sourceIP: string;
  destinationIP: string;
  sourcePort: string;
  destinationPort: string;
  host: string;
  dnsMode: string;
};

// "/logs"
export type LogLevelT = "debug" | "info" | "warning" | "error";
export type LogT = {
  type: "debug" | "warning" | "info";
  payload: string;
  time?: string;
};
export type LogsT = Array<LogT>;

// "/proxies"
export type ProxyT = {
  name: string;
  history: [];
  all: Array<string>;
  now: string;
  type: string;
};
export type ProxiesT = Map<string, ProxyT>;

export type RuleT = {
  type: string;
  payload: string;
  proxy: string;
};

export type ModeT = "rule" | "global" | "direct" | "script";

export type ConfigT = {
  port?: number;
  socketPort?: number;
  redirPort?: number;
  allowLan?: boolean;
  mode: ModeT;
  logLevel?: LogLevelT;
};
