export interface ProxySettings {
  httpProxy?: string;
  httpsProxy?: string;
  socksProxy?: string;
  autoProxyUrl?: string;
  noProxy?: string;
  proxyEnabled?: boolean;
}

export interface ProxyInfoItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  accessories?: Array<{ text: string; tooltip?: string }>;
  type: "status" | "http" | "https" | "socks" | "auto" | "bypass" | "service" | "service-selector";
  value?: string;
  editable?: boolean;
  serviceIndex?: number; // For service selector items
}

export interface NetworkService {
  name: string;
  isActive: boolean;
}
