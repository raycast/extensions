// Clash proxy mode types
export type ClashMode = "rule" | "global" | "direct";

// Clash configuration information
export interface ClashConfig {
  port: number;
  "socks-port": number;
  "redir-port": number;
  "tproxy-port": number;
  "mixed-port": number;
  "allow-lan": boolean;
  mode: ClashMode;
  "log-level": string;
  "external-controller": string;
  secret?: string;
}

// Proxy node history record
export interface ProxyHistory {
  time: string;
  delay: number;
}

// Proxy node information
export interface ProxyItem {
  name: string;
  type: string;
  history: ProxyHistory[];
  provider?: string;
  udp?: boolean;
  server?: string;
  port?: number;
}

// Proxy group information
export interface ProxyGroup {
  name: string;
  type: string;
  now: string;
  all: string[];
  history: ProxyHistory[];
}

// Proxy information response
export interface ProxiesResponse {
  proxies: Record<string, ProxyItem | ProxyGroup>;
}

// Delay test result
export interface DelayResult {
  delay: number;
}

// Connection information
export interface Connection {
  id: string;
  metadata: {
    network: string;
    type: string;
    sourceIP: string;
    destinationIP: string;
    sourcePort: string;
    destinationPort: string;
    host: string;
  };
  upload: number;
  download: number;
  start: string;
  chains: string[];
  rule: string;
}

// Connection response
export interface ConnectionsResponse {
  downloadTotal: number;
  uploadTotal: number;
  connections: Connection[];
}

// Version information
export interface Version {
  premium: boolean;
  meta?: boolean;
  version: string;
}

// API error response
export interface ApiError {
  message: string;
}

// Extension preferences
export interface ExtensionPreferences {
  clashApiUrl: string;
  clashSecret?: string;
  autoCloseConnections: boolean;
  refreshInterval: string;
}

// Mode icon mapping
export const MODE_ICONS: Record<ClashMode, string> = {
  rule: "🔀",
  global: "🌐",
  direct: "➡️",
};

// Mode name mapping
export const MODE_NAMES: Record<ClashMode, string> = {
  rule: "Rule Mode",
  global: "Global Mode",
  direct: "Direct Mode",
};

// Proxy type icon mapping
export const PROXY_TYPE_ICONS: Record<string, string> = {
  Shadowsocks: "🔒",
  ShadowsocksR: "🔐",
  Vmess: "✈️",
  Vless: "🚀",
  Trojan: "🐎",
  Http: "🌐",
  Https: "🔐",
  Socks5: "🧦",
  Direct: "➡️",
  Reject: "❌",
  Selector: "🎯",
  URLTest: "⚡",
  Fallback: "🔄",
  LoadBalance: "⚖️",
};
