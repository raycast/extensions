export type ConnectionState = "connected" | "stopped" | "needs-login" | "starting" | "unknown";
export type ServiceKind = "serve" | "funnel";
export type ConflictBehavior = "skip" | "overwrite" | "rename";

export interface HealthMessage {
  id: string;
  level: "info" | "warning" | "error";
  text: string;
}

export interface LocalNode {
  id: string;
  hostName: string;
  dnsName?: string;
  tailnetName?: string;
  ips: string[];
  relay?: string;
  online: boolean;
  currentExitNodeId?: string;
  currentExitNodeName?: string;
  keyExpiry?: string;
}

export interface PeerNode {
  id: string;
  hostName: string;
  dnsName?: string;
  os?: string;
  ips: string[];
  online: boolean;
  relay?: string;
  lastSeen?: string;
  exitNode: boolean;
  exitNodeOption: boolean;
  active: boolean;
  taildropTarget: number;
  noFileSharingReason?: string;
}

export interface ExitNode {
  id: string;
  title: string;
  subtitle?: string;
  selected: boolean;
}

export interface AdvancedSettingsState {
  acceptDns: boolean;
  acceptRoutes: boolean;
  ssh: boolean;
  webClient: boolean;
  shieldsUp: boolean;
  exitNodeAllowLanAccess: boolean;
}

export interface ServiceStatus {
  kind: ServiceKind;
  enabled: boolean;
  summary: string;
  rawJson: string;
  host?: string;
  path?: string;
  target?: string;
}

export interface DashboardState {
  backendState: string;
  connectionState: ConnectionState;
  authUrl?: string;
  self?: LocalNode;
  peers: PeerNode[];
  exitNodes: ExitNode[];
  health: HealthMessage[];
  magicDnsSuffix?: string;
  clientVersion?: string | null;
  daemonVersion?: string | null;
  settings?: AdvancedSettingsState;
  serveStatus?: ServiceStatus;
  funnelStatus?: ServiceStatus;
}

export interface PingResult {
  summary: string;
  output: string;
}

export interface NetcheckResult {
  summary: string;
  output: string;
  ranAt: string;
}
