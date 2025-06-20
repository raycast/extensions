import { TransportType, MCPServerConfig } from "../types/mcpServer";

export type TransportConfig = {
  transport?: TransportType;
  type?: TransportType;
  url?: string;
  serverUrl?: string;
  command?: string;
  [key: string]: unknown;
};

export function inferTransport(config: TransportConfig): TransportType {
  if (config.transport) {
    return config.transport as TransportType;
  }

  if (config.type) {
    return config.type as TransportType;
  }

  if ("url" in config && config.url) {
    return "sse";
  }

  if ("serverUrl" in config && config.serverUrl) {
    return "/sse";
  }

  return "stdio";
}

export function getTransportType(config: MCPServerConfig): TransportType {
  if ("type" in config && config.type) {
    return config.type as TransportType;
  }

  if ("transport" in config && config.transport) {
    return config.transport as TransportType;
  }

  return inferTransport(config as TransportConfig);
}
