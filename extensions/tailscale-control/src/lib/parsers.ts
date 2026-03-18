import { randomUUID } from "node:crypto";

import {
  AdvancedSettingsState,
  DashboardState,
  ExitNode,
  HealthMessage,
  LocalNode,
  NetcheckResult,
  PeerNode,
  PingResult,
  ServiceKind,
  ServiceStatus,
} from "../types";

const EXIT_NODE_EMPTY_PATTERN = /no exit nodes found/i;

interface RawStatusNode {
  ID?: string;
  HostName?: string;
  DNSName?: string;
  OS?: string;
  TailscaleIPs?: string[];
  Relay?: string;
  Online?: boolean;
  ExitNode?: boolean;
  ExitNodeOption?: boolean;
  Active?: boolean;
  LastSeen?: string;
  KeyExpiry?: string;
  TaildropTarget?: number;
  NoFileSharingReason?: string;
}

interface RawStatus {
  BackendState?: string;
  AuthURL?: string;
  Version?: string;
  ClientVersion?: string | null;
  MagicDNSSuffix?: string;
  CurrentTailnet?: {
    Name?: string;
  };
  Self?: RawStatusNode;
  Peer?: Record<string, RawStatusNode>;
  Health?: string[];
}

interface RawPrefs {
  RouteAll?: boolean;
  ExitNodeAllowLANAccess?: boolean;
  CorpDNS?: boolean;
  RunSSH?: boolean;
  RunWebClient?: boolean;
  ShieldsUp?: boolean;
}

interface RawServiceStatus {
  TCP?: Record<string, Record<string, unknown>>;
  Web?: Record<
    string,
    {
      Handlers?: Record<string, Record<string, unknown>>;
    }
  >;
}

function parseConnectionState(backendState?: string, authUrl?: string): DashboardState["connectionState"] {
  if (authUrl) {
    return "needs-login";
  }

  switch (backendState) {
    case "Running":
      return "connected";
    case "Stopped":
      return "stopped";
    case "Starting":
      return "starting";
    default:
      return "unknown";
  }
}

function inferHealthLevel(message: string): HealthMessage["level"] {
  if (/\b(error|failed|unhealthy)\b/i.test(message)) {
    return "error";
  }

  if (/\b(warn|warning|unstable|degraded)\b/i.test(message)) {
    return "warning";
  }

  return "info";
}

function normalizeDnsName(dnsName?: string): string | undefined {
  return dnsName ? dnsName.replace(/\.$/, "") : undefined;
}

export function parseStatusOutput(statusJson: string): Omit<DashboardState, "exitNodes"> {
  const raw = JSON.parse(statusJson) as RawStatus;

  const peers: PeerNode[] = Object.values(raw.Peer ?? {})
    .map((peer) => ({
      id: peer.ID ?? peer.DNSName ?? peer.HostName ?? randomUUID(),
      hostName: peer.HostName ?? "Unknown Peer",
      dnsName: normalizeDnsName(peer.DNSName),
      os: peer.OS,
      ips: peer.TailscaleIPs ?? [],
      online: Boolean(peer.Online),
      relay: peer.Relay,
      lastSeen: peer.LastSeen,
      exitNode: Boolean(peer.ExitNode),
      exitNodeOption: Boolean(peer.ExitNodeOption),
      active: Boolean(peer.Active),
      taildropTarget: peer.TaildropTarget ?? 0,
      noFileSharingReason: peer.NoFileSharingReason || undefined,
    }))
    .sort((left, right) => {
      if (left.online !== right.online) {
        return left.online ? -1 : 1;
      }

      return left.hostName.localeCompare(right.hostName);
    });

  const selectedExitNode = peers.find((peer) => peer.exitNode);

  const self = raw.Self
    ? ({
        id: raw.Self.ID ?? "self",
        hostName: raw.Self.HostName ?? "This Device",
        dnsName: normalizeDnsName(raw.Self.DNSName),
        tailnetName: raw.CurrentTailnet?.Name,
        ips: raw.Self.TailscaleIPs ?? [],
        relay: raw.Self.Relay,
        online: Boolean(raw.Self.Online),
        currentExitNodeId: selectedExitNode?.id,
        currentExitNodeName: selectedExitNode?.hostName,
        keyExpiry: raw.Self.KeyExpiry,
      } satisfies LocalNode)
    : undefined;

  return {
    backendState: raw.BackendState ?? "Unknown",
    connectionState: parseConnectionState(raw.BackendState, raw.AuthURL),
    authUrl: raw.AuthURL || undefined,
    self,
    peers,
    health: (raw.Health ?? []).map((message, index) => ({
      id: `health-${index}`,
      level: inferHealthLevel(message),
      text: message,
    })),
    magicDnsSuffix: raw.MagicDNSSuffix,
    clientVersion: raw.ClientVersion ?? null,
    daemonVersion: raw.Version ?? null,
  };
}

export function isNoExitNodesOutput(value: string): boolean {
  return EXIT_NODE_EMPTY_PATTERN.test(value);
}

export function parseExitNodeList(output: string, peers: PeerNode[], selectedExitNodeId?: string): ExitNode[] {
  const peerLookup = new Map<string, PeerNode>();

  for (const peer of peers) {
    peerLookup.set(peer.hostName.toLowerCase(), peer);
    if (peer.dnsName) {
      peerLookup.set(peer.dnsName.toLowerCase(), peer);
    }
    for (const ip of peer.ips) {
      peerLookup.set(ip.toLowerCase(), peer);
    }
  }

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith("Warning:"))
    .filter((line) => !/^IP(\s|$)/i.test(line))
    .map((line) => {
      const selected = line.startsWith("*") || line.startsWith(">");
      const cleanLine = line.replace(/^[*>]\s*/, "");
      const [id, ...rest] = cleanLine.split(/\s+/);
      const peer = peerLookup.get(id.toLowerCase()) ?? peerLookup.get((rest[0] ?? "").toLowerCase());
      const title = peer?.hostName ?? rest[0] ?? id;
      const subtitleParts = peer ? [peer.ips[0], peer.os, peer.online ? "Online" : "Offline"].filter(Boolean) : rest;

      return {
        id,
        title,
        subtitle: subtitleParts.join(" • "),
        selected: selected || selectedExitNodeId === peer?.id || selectedExitNodeId === id,
      } satisfies ExitNode;
    })
    .sort((left, right) => {
      if (left.selected !== right.selected) {
        return left.selected ? -1 : 1;
      }

      return left.title.localeCompare(right.title);
    });
}

export function parsePingOutput(output: string): PingResult {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    summary: lines[0] ?? "Ping complete",
    output: output.trim(),
  };
}

export function parseNetcheckOutput(output: string, ranAt: string): NetcheckResult {
  const reportIndex = output.indexOf("Report:");
  const normalizedOutput = (reportIndex >= 0 ? output.slice(reportIndex) : output).trim();
  const lines = normalizedOutput
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    summary: lines.find((line) => line.startsWith("* Nearest DERP")) ?? lines[0] ?? "Netcheck complete",
    output: normalizedOutput,
    ranAt,
  };
}

export function parsePrefsOutput(output: string): AdvancedSettingsState {
  const raw = JSON.parse(output) as RawPrefs;

  return {
    acceptDns: Boolean(raw.CorpDNS),
    acceptRoutes: Boolean(raw.RouteAll),
    ssh: Boolean(raw.RunSSH),
    webClient: Boolean(raw.RunWebClient),
    shieldsUp: Boolean(raw.ShieldsUp),
    exitNodeAllowLanAccess: Boolean(raw.ExitNodeAllowLANAccess),
  };
}

export function parseServiceStatusOutput(kind: ServiceKind, output?: string): ServiceStatus {
  if (!output?.trim()) {
    return {
      kind,
      enabled: false,
      summary: "Not configured",
      rawJson: "{}",
    };
  }

  const raw = JSON.parse(output) as RawServiceStatus;
  const tcpKeys = Object.keys(raw.TCP ?? {});
  const webEntries = Object.entries(raw.Web ?? {});
  const enabled = tcpKeys.length > 0 || webEntries.length > 0;
  const [host, hostConfig] = webEntries[0] ?? [];
  const [path, handler] = Object.entries(hostConfig?.Handlers ?? {})[0] ?? [];
  const target = handler
    ? ((handler.Proxy as string | undefined) ?? (handler.Text as string | undefined) ?? "Configured")
    : undefined;

  let summary = "Not configured";

  if (host && path && target) {
    summary = `${host}${path} -> ${target}`;
  } else if (host) {
    summary = host;
  } else if (tcpKeys.length > 0) {
    summary = `TCP ports: ${tcpKeys.join(", ")}`;
  }

  return {
    kind,
    enabled,
    summary,
    rawJson: JSON.stringify(raw, null, 2),
    host,
    path,
    target,
  };
}
